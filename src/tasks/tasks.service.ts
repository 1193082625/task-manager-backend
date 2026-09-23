import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { Prisma, Task, WorkStatus } from '../generated/prisma/client.js';
import {
  TaskListResponseDto,
  TaskResponseDto,
} from './dto/task-response.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import { QueryTasksDto } from './dto/query-tasks.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

const allowedTransitions: Record<WorkStatus, readonly WorkStatus[]> = {
  notStarted: ['doing', 'canceled'],
  doing: ['stopped', 'completed', 'canceled'],
  stopped: ['doing', 'canceled'],
  completed: ['doing'],
  canceled: [],
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(task: Task): TaskResponseDto {
    return {
      id: task.id,
      name: task.name,
      description: task.description,
      principalId: task.principalId,
      projectId: task.projectId,
      status: task.status,
      startTime: task.startTime.toISOString(),
      endTime: task.endTime.toISOString(),
      realStartTime: task.realStartTime?.toISOString() ?? null,
      realEndTime: task.realEndTime?.toISOString() ?? null,
    };
  }

  async create(dto: CreateTaskDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (
      !Number.isFinite(startTime.getTime()) ||
      !Number.isFinite(endTime.getTime())
    ) {
      throw new BadRequestException('任务时间无效');
    }

    if (endTime.getTime() < startTime.getTime()) {
      throw new BadRequestException('结束时间不能早于开始时间');
    }

    const principal = await this.prisma.user.findUnique({
      where: { id: dto.principalId },
      select: { id: true },
    });

    if (!principal) {
      throw new BadRequestException('负责人不存在，请重新选择');
    }

    if (dto.projectId !== null && dto.projectId !== undefined) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
        select: { id: true },
      });

      if (!project) {
        throw new BadRequestException('项目不存在，请重新选择');
      }
    }

    try {
      const task = await this.prisma.task.create({
        data: {
          name: dto.name.trim(),
          description: dto.description ?? '',
          principalId: dto.principalId,
          projectId: dto.projectId ?? null,
          startTime,
          endTime,
        },
      });

      return this.toResponse(task);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException('负责人或项目已不存在，请刷新后重试');
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }
    return this.toResponse(task);
  }

  async updateStatus(
    id: string,
    dto: UpdateTaskStatusDto,
  ): Promise<TaskResponseDto> {
    try {
      // 这段代码用了事务：将“读取当前任务、判断规则、写入变化”放在痛一个数据库事务中
      // 事务内部使用 tx.task，而不是 this.prisma.task，这样操作才属于该事务
      // Serializable 用来防止并发请求基于互相冲突的旧状态都成功提交；发生写入冲突时，我们将 P2034 转成 409，让用户刷新后重试
      return await this.prisma.$transaction(
        async (tx) => {
          const task = await tx.task.findUnique({
            where: { id },
          });

          if (!task) {
            throw new NotFoundException('任务不存在');
          }

          const targetStatus = dto.status;

          // 重复提交相同状态，不更新实际时间
          if (task.status === targetStatus) {
            return this.toResponse(task);
          }

          if (!allowedTransitions[task.status].includes(targetStatus)) {
            throw new ConflictException(
              `不允许从 ${task.status} 切换到 ${targetStatus}`,
            );
          }

          const data: Prisma.TaskUpdateInput = {
            status: targetStatus,
          };

          const now = new Date();

          if (targetStatus === 'doing') {
            if (task.status === 'notStarted') {
              if (task.realStartTime !== null || task.realEndTime !== null) {
                throw new ConflictException('任务实际时间与未开始状态不一致');
              }

              data.realStartTime = now;
            } else if (task.realStartTime === null) {
              throw new ConflictException('任务缺少实际开始时间');
            }

            // 恢复或重新打开时保留首次开始时间
            data.realEndTime = null;
          }

          if (targetStatus === 'completed') {
            if (task.realStartTime === null) {
              throw new ConflictException('任务缺少实际开始时间');
            }

            if (now.getTime() < task.realStartTime.getTime()) {
              throw new ConflictException('结束时间不能早于实际开始时间');
            }

            data.realEndTime = now;
          }

          if (targetStatus === 'stopped' || targetStatus === 'canceled') {
            // 暂停、取消不作为完成，保留已有开始时间
            data.realEndTime = null;
          }

          const updatedTask = await tx.task.update({
            where: { id },
            data,
          });

          return this.toResponse(updatedTask);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2025')
      ) {
        throw new ConflictException('任务已被其他请求修改或删除，请刷新后重试');
      }
      throw error;
    }
  }

  async findAll(query: QueryTasksDto): Promise<TaskListResponseDto> {
    const { page, limit, projectId, principalId, status } = query;
    const name = query.name?.trim();

    const where: Prisma.TaskWhereInput = {};

    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (principalId) {
      where.principalId = principalId;
    }

    if (status) {
      where.status = status;
    }

    if (query.startTime && query.endTime && query.startTime > query.endTime) {
      throw new BadRequestException('筛选结束日期不能早于开始日期');
    }

    if (query.startTime) {
      const rangeStart = new Date(`${query.startTime}T00:00:00+08:00`);

      where.endTime = {
        gte: rangeStart,
      };
    }

    if (query.endTime) {
      const endDayStart = new Date(`${query.endTime}T00:00:00+08:00`);

      const rangeEndExclusive = new Date(
        endDayStart.getTime() + 24 * 60 * 60 * 1000,
      );

      where.startTime = {
        lt: rangeEndExclusive,
      };
    }

    if ((query.orderby !== undefined) !== (query.order !== undefined)) {
      throw new BadRequestException('orderby 和 order 必须一起提供');
    }

    let orderBy: Prisma.TaskOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'asc' },
    ];

    if (query.orderby && query.order) {
      const field = query.orderby;
      const direction = query.order;

      let primaryOrder: Prisma.TaskOrderByWithRelationInput;

      if (field === 'realStartTime' || field === 'realEndTime') {
        primaryOrder = {
          [field]: {
            sort: direction,
            nulls: 'last',
          },
        };
      } else {
        primaryOrder = {
          [field]: direction,
        };
      }

      orderBy = [primaryOrder, { id: 'asc' }];
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: orderBy,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      list: tasks.map((task) => this.toResponse(task)),
      total,
    };
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskResponseDto> {
    const values = [
      dto.name,
      dto.description,
      dto.principalId,
      dto.projectId,
      dto.startTime,
      dto.endTime,
    ];

    if (values.every((value) => value === undefined)) {
      throw new BadRequestException('至少提供一个需要更新的字段');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const task = await tx.task.findUnique({
            where: { id },
          });

          if (!task) {
            throw new NotFoundException('任务不存在');
          }

          const startTime =
            dto.startTime === undefined
              ? task.startTime
              : new Date(dto.startTime);
          const endTime =
            dto.endTime === undefined ? task.endTime : new Date(dto.endTime);

          if (
            !Number.isFinite(startTime.getTime()) ||
            !Number.isFinite(endTime.getTime())
          ) {
            throw new BadRequestException('任务时间无效');
          }

          if (endTime.getTime() < startTime.getTime()) {
            throw new BadRequestException('结束时间不能早于开始时间');
          }

          if (dto.principalId !== undefined) {
            const principal = await tx.user.findUnique({
              where: { id: dto.principalId },
              select: { id: true },
            });

            if (!principal) {
              throw new BadRequestException('负责人不存在');
            }
          }

          if (dto.projectId !== undefined && dto.projectId !== null) {
            const project = await tx.project.findUnique({
              where: { id: dto.projectId },
              select: { id: true },
            });

            if (!project) {
              throw new BadRequestException('项目不存在');
            }
          }

          const data: Prisma.TaskUpdateInput = {};

          if (dto.name !== undefined) {
            data.name = dto.name.trim();
          }

          if (dto.description !== undefined) {
            data.description = dto.description;
          }

          if (dto.startTime !== undefined) {
            data.startTime = startTime;
          }

          if (dto.endTime !== undefined) {
            data.endTime = endTime;
          }

          if (dto.principalId !== undefined) {
            data.principal = {
              connect: { id: dto.principalId },
            };
          }

          if (dto.projectId !== undefined) {
            data.project =
              dto.projectId === null
                ? { disconnect: true }
                : { connect: { id: dto.projectId } };
          }

          const updatedTask = await tx.task.update({
            where: { id },
            data,
          });

          return this.toResponse(updatedTask);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BadRequestException('负责人或项目已不存在');
        }

        if (error.code === 'P2025' || error.code === 'P2034') {
          throw new ConflictException('任务或关联数据已发生变化，请刷新后重试');
        }
      }

      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.task.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('任务不存在');
      }
      throw error;
    }
  }
}
