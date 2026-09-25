import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { ProjectMemberResponseDto } from './dto/project-member-response.dto.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';

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

  async create(dto: CreateProjectDto, creatorId: string) {
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
      const project = await this.prisma.$transaction(async (tx) => {
        const createdProject = await tx.project.create({
          data: {
            name: dto.name.trim(),
            description: dto.description ?? '',
            principalId: dto.principalId,
            startTime: new Date(`${dto.startTime}T00:00:00.000Z`),
            endTime: new Date(`${dto.endTime}T00:00:00.000Z`),
          },
          include: projectTaskInclude, // 表示除了项目自身字段，还要带哪些关联数据
        });
        await tx.projectMember.createMany({
          data: [
            {
              projectId: createdProject.id,
              userId: creatorId,
            },
            {
              projectId: createdProject.id,
              userId: dto.principalId,
            },
          ],
          skipDuplicates: true,
        });

        return createdProject;
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

  async findOne(
    id: string,
    currentUserId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: projectTaskInclude,
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId: currentUserId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('你不是该项目成员');
    }
    return this.toResponse(project);
  }

  async findMembers(
    projectId: string,
    currentUserId: string,
  ): Promise<ProjectMemberResponseDto[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { principalId: true },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: currentUserId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('你不是该项目成员');
    }

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      select: {
        userId: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            role: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
    });

    return members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      role: member.user.role,
      isActive: member.user.isActive,
      isPrincipal: member.userId === project.principalId,
      joinedAt: member.createdAt.toISOString(),
    }));
  }

  async addMember(
    projectId: string,
    dto: AddProjectMemberDto,
    currentUserId: string,
  ): Promise<ProjectMemberResponseDto> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const project = await tx.project.findUnique({
            where: { id: projectId },
            select: { principalId: true },
          });

          if (!project) {
            throw new NotFoundException('项目不存在');
          }

          if (project.principalId !== currentUserId) {
            throw new ForbiddenException('只有项目负责人可以添加成员');
          }

          const existingMember = await tx.projectMember.findUnique({
            where: {
              projectId_userId: {
                projectId,
                userId: dto.userId,
              },
            },
            select: { userId: true },
          });

          if (existingMember) {
            throw new ConflictException('该用户已是项目成员');
          }

          const user = await tx.user.findUnique({
            where: { id: dto.userId },
            select: {
              id: true,
              name: true,
              role: true,
              isActive: true,
            },
          });

          if (!user) {
            throw new BadRequestException('用户不存在，请重新选择');
          }

          if (!user.isActive) {
            throw new BadRequestException('不能添加已停用的用户');
          }

          const member = await tx.projectMember.create({
            data: {
              projectId,
              userId: user.id,
            },
          });

          return {
            userId: member.userId,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            isPrincipal: member.userId === project.principalId,
            joinedAt: member.createdAt.toISOString(),
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('该用户已是项目成员');
        }

        if (error.code === 'P2034') {
          throw new ConflictException('项目或用户状态已发生变化，请刷新后重试');
        }

        if (error.code === 'P2003') {
          throw new ConflictException('项目或用户已不存在，请刷新后重试');
        }
      }

      throw error;
    }
  }

  async removeMember(
    projectId: string,
    userId: string,
    currentUserId: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const project = await tx.project.findUnique({
            where: { id: projectId },
            select: { principalId: true },
          });

          if (!project) {
            throw new NotFoundException('项目不存在');
          }

          if (project.principalId !== currentUserId) {
            throw new ForbiddenException('只有项目负责人可以移除成员');
          }

          if (userId === project.principalId) {
            throw new ConflictException('不能移除项目负责人');
          }

          const membership = await tx.projectMember.findUnique({
            where: {
              projectId_userId: {
                projectId,
                userId,
              },
            },
            select: { userId: true },
          });

          if (!membership) {
            throw new NotFoundException('该用户不是项目成员');
          }

          const assignedTask = await tx.task.findFirst({
            where: {
              projectId,
              principalId: userId,
            },
            select: { id: true },
          });

          if (assignedTask) {
            throw new ConflictException(
              '该成员仍是项目内任务的负责人，请先转移任务',
            );
          }

          await tx.projectMember.delete({
            where: {
              projectId_userId: {
                projectId,
                userId,
              },
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025' || error.code === 'P2034') {
          throw new ConflictException('项目或成员状态已发生变化，请刷新后重试');
        }
      }

      throw error;
    }
  }

  async findAll(
    query: QueryProjectsDto,
    currentUserId: string,
  ): Promise<ProjectListResponseDto> {
    const { page, limit, principalId, stage, status } = query;
    const name = query.name?.trim();

    // 表示 查询 Project 的 members 中 至少 some 一条记录， userId 等于当前登录用户
    const where: Prisma.ProjectWhereInput = {
      members: {
        some: {
          userId: currentUserId,
        },
      },
    };

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

  async update(
    id: string,
    dto: UpdateProjectDto,
    currentUserId: string,
  ): Promise<ProjectResponseDto> {
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

          if (project.principalId !== currentUserId) {
            throw new ForbiddenException('只有项目负责人可以编辑项目');
          }

          if (dto.principalId !== undefined) {
            const principal = await tx.user.findUnique({
              where: { id: dto.principalId },
              select: { id: true },
            });

            if (!principal) {
              throw new BadRequestException('负责人不存在');
            }

            // upsert: 新负责人已经是成员则不做任何修改，新负责人不是成员，则创建 ProjectMember
            await tx.projectMember.upsert({
              where: {
                projectId_userId: {
                  projectId: id,
                  userId: dto.principalId,
                },
              },
              update: {},
              create: {
                projectId: id,
                userId: dto.principalId,
              },
            });
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

  async findAllOptions(currentUserId: string): Promise<ProjectResponseDto[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: currentUserId,
          },
        },
      },
      include: projectTaskInclude,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return projects.map((project) => this.toResponse(project));
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const project = await tx.project.findUnique({
          where: { id },
          select: {
            principalId: true,
          },
        });

        if (!project) {
          throw new NotFoundException('项目不存在');
        }

        if (project.principalId !== currentUserId) {
          throw new ForbiddenException('只有项目负责人可以删除项目');
        }
        await tx.project.delete({
          where: { id },
        });
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
