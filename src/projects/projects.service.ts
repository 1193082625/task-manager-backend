import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  ProjectListResponseDto,
  ProjectResponseDto,
} from './dto/project-response.dto.js';

import { NotFoundException } from '@nestjs/common';
import { QueryProjectsDto } from './dto/query-projects.dto.js';
import { summarizeProjectTasks } from './project-task-summary.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';

// 告诉 prisma，查询项目时还要带哪些任务数据，可以把它理解为一份查询配置
// 声明这个对象不会访问数据库，只有将它传给 findMany()、findUnique() 等方法并执行查询时，它才起作用
const projectTaskInclude = {
  // tasks 对应 schema 中的关系字段 tasks Task[]
  tasks: {
    select: {
      principalId: true,
      status: true,
      realStartTime: true,
      realEndTime: true,
    },
  },
} satisfies Prisma.ProjectInclude;

// 项目字段，加上明确查询的任务字段。这样 TypeScript 能保证统计时确实拿到了任务数据。
type ProjectWithTasks = Prisma.ProjectGetPayload<{
  include: typeof projectTaskInclude;
}>;

/**
 * 这版实际日期排序适合当前小规模学习项目，会读取所有匹配项目及所需任务字段。数据量增大后，需要改成数据库聚合排序；目前先保证结果与分页语义正确。空值始终排最后。
 */
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(project: ProjectWithTasks): ProjectResponseDto {
    const summary = summarizeProjectTasks(project.tasks);

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      principalId: project.principalId,
      stage: project.stage,
      startTime: project.startTime.toISOString().slice(0, 10),
      endTime: project.endTime.toISOString().slice(0, 10),
      ...summary,
    };
  }

  async create(dto: CreateProjectDto) {
    if (dto.endTime < dto.startTime) {
      throw new BadRequestException('结束日期不能早于开始日期');
    }

    const principal = await this.prisma.user.findUnique({
      where: { id: dto.principalId },
      select: { id: true },
    });

    if (!principal) {
      throw new BadRequestException('负责人不存在，请重新选择');
    }

    try {
      const project = await this.prisma.project.create({
        data: {
          name: dto.name.trim(),
          description: dto.description ?? '',
          principalId: dto.principalId,
          startTime: new Date(`${dto.startTime}T00:00:00.000Z`),
          endTime: new Date(`${dto.endTime}T00:00:00.000Z`),
        },
        include: projectTaskInclude, // 表示除了项目自身字段，还要带哪些关联数据
      });

      return this.toResponse(project);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException('负责人不存在，请重新选择');
      }

      throw error;
    }
  }

  async findOne(id: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: projectTaskInclude,
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return this.toResponse(project);
  }

  async findAll(query: QueryProjectsDto): Promise<ProjectListResponseDto> {
    const { page, limit, principalId, stage, status } = query;
    const name = query.name?.trim();

    const where: Prisma.ProjectWhereInput = {};

    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    if (principalId) {
      where.principalId = principalId;
    }

    if (stage) {
      where.stage = stage;
    }

    if (query.startTime && query.endTime && query.startTime > query.endTime) {
      throw new BadRequestException('筛选结束日期不能早于开始日期');
    }

    if (query.startTime) {
      where.endTime = {
        gte: new Date(`${query.startTime}T00:00:00.000Z`),
      };
    }
    if (query.endTime) {
      where.startTime = {
        lte: new Date(`${query.endTime}T00:00:00.000Z`),
      };
    }

    if ((query.orderby !== undefined) !== (query.order !== undefined)) {
      throw new BadRequestException('orderby 和 order 必须一起提供');
    }

    const field = query.orderby;
    const direction = query.order;

    if (
      (field === 'realStartTime' ||
        field === 'realEndTime' ||
        field === 'taskCount') &&
      direction
    ) {
      const projects = await this.prisma.project.findMany({
        where,
        include: projectTaskInclude,
      });

      const rows = projects
        .map((project) => this.toResponse(project))
        .filter((project) => !status || project.status === status);
      const multiplier = direction === 'asc' ? 1 : -1;

      rows.sort((a, b) => {
        if (field === 'taskCount') {
          const difference = a.taskCount - b.taskCount;
          return difference * multiplier || a.id.localeCompare(b.id);
        }

        const aValue = a[field];
        const bValue = b[field];

        if (aValue === null && bValue === null) {
          return a.id.localeCompare(b.id);
        }

        if (aValue === null) return 1;
        if (bValue === null) return -1;

        const difference =
          new Date(aValue).getTime() - new Date(bValue).getTime();

        return difference * multiplier || a.id.localeCompare(b.id);
      });

      const offset = (page - 1) * limit;

      return {
        list: rows.slice(offset, offset + limit),
        total: rows.length,
      };
    }

    let orderBy: Prisma.ProjectOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'asc' },
    ];

    if ((field === 'startTime' || field === 'endTime') && direction) {
      orderBy = [{ [field]: direction }, { id: 'asc' }];
    }

    if (status) {
      const projects = await this.prisma.project.findMany({
        where,
        include: projectTaskInclude,
        orderBy,
      });
      const rows = projects
        .map((project) => this.toResponse(project))
        .filter((project) => project.status === status);

      const offset = (page - 1) * limit;

      return {
        list: rows.slice(offset, offset + limit),
        total: rows.length,
      };
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: projectTaskInclude,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      list: projects.map((project) => this.toResponse(project)),
      total,
    };
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectResponseDto> {
    const values = [
      dto.name,
      dto.description,
      dto.principalId,
      dto.startTime,
      dto.endTime,
    ];

    if (values.every((value) => value === undefined)) {
      throw new BadRequestException('至少提供一个需要更新的字段');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const project = await tx.project.findUnique({
            where: { id },
          });

          if (!project) {
            throw new NotFoundException('项目不存在');
          }

          const startTime =
            dto.startTime === undefined
              ? project.startTime
              : new Date(`${dto.startTime}T00:00:00.000Z`);
          const endTime =
            dto.endTime === undefined
              ? project.endTime
              : new Date(`${dto.endTime}T00:00:00.000Z`);

          if (
            !Number.isFinite(startTime.getTime()) ||
            !Number.isFinite(endTime.getTime())
          ) {
            throw new BadRequestException('项目计划日期无效');
          }

          if (endTime.getTime() < startTime.getTime()) {
            throw new BadRequestException('结束日期不能早于开始日期');
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

          const data: Prisma.ProjectUpdateInput = {};

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

          const updatedProject = await tx.project.update({
            where: { id },
            data,
            include: projectTaskInclude,
          });

          return this.toResponse(updatedProject);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BadRequestException('负责人已不存在，请重新选择');
        }
        if (error.code === 'P2025' || error.code === 'P2034') {
          throw new ConflictException('项目获关联数据已发生变化，请刷新后重试');
        }
      }
      throw error;
    }
  }

  async findAllOptions(): Promise<ProjectResponseDto[]> {
    const projects = await this.prisma.project.findMany({
      include: projectTaskInclude,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return projects.map((project) => this.toResponse(project));
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.project.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('项目不存在');
        }

        if (error.code === 'P2003') {
          throw new ConflictException('项目下仍有任务，请先转移或删除任务');
        }
      }
      throw error;
    }
  }
}
