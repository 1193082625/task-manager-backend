import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CommentResponseDto } from './dto/comment-response.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';

const commentInclude = {
  author: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
} satisfies Prisma.CommentInclude;

type CommentWithAuthor = Prisma.CommentGetPayload<{
  include: typeof commentInclude;
}>;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(comment: CommentWithAuthor): CommentResponseDto {
    return {
      id: comment.id,
      taskId: comment.taskId,
      content: comment.content,
      author: comment.author,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  private async assertCanAccessTask(
    taskId: string,
    currentUserId: string,
  ): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        projectId: true,
        principalId: true,
        project: {
          select: {
            members: {
              where: {
                userId: currentUserId,
              },
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    const canAccess =
      task.projectId === null
        ? task.principalId === currentUserId
        : (task.project?.members.length ?? 0) > 0;

    if (!canAccess) {
      throw new ForbiddenException('你无权查看该任务的评论');
    }
  }

  async findAll(
    taskId: string,
    currentUserId: string,
  ): Promise<CommentResponseDto[]> {
    await this.assertCanAccessTask(taskId, currentUserId);

    const comments = await this.prisma.comment.findMany({
      where: {
        taskId,
      },
      include: commentInclude,
      orderBy: [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });

    return comments.map((comment) => this.toResponse(comment));
  }

  async create(taskId: string, dto: CreateCommentDto, creatorId: string) {
    await this.assertCanAccessTask(taskId, creatorId);

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content.trim(),
        task: {
          connect: {
            id: taskId,
          },
        },
        author: {
          connect: {
            id: creatorId,
          },
        },
      },
      include: commentInclude,
    });
    return this.toResponse(comment);
  }

  async remove(
    taskId: string,
    commentId: string,
    currentUserId: string,
  ): Promise<void> {
    await this.assertCanAccessTask(taskId, currentUserId);

    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.authorId !== currentUserId) {
      throw new ForbiddenException('只能删除自己的评论');
    }

    await this.prisma.comment.delete({
      where: {
        id: comment.id,
      },
    });
  }
}
