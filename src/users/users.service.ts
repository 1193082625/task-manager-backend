import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { QueryUsersDto } from './dto/query.users.dto.js';
import { Prisma, SystemRole } from '../generated/prisma/client.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import * as argon2 from 'argon2';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const { page, limit } = query;
    const name = query.name?.trim();
    const phone = query.phone?.trim();

    const where: Prisma.UserWhereInput = {};
    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    if (phone) {
      where.phone = {
        contains: phone,
      };
    }

    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          systemRole: true,
          isActive: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      list,
      total,
    };
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          phone: dto.phone,
          passwordHash,
          role: dto.role,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          systemRole: true,
          isActive: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('手机号已存在');
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        systemRole: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.phone !== undefined) {
      data.phone = dto.phone;
    }

    if (dto.role !== undefined) {
      data.role = dto.role;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('至少提供一个需要更新的字段');
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          systemRole: true,
          isActive: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('用户不存在');
      }
      throw error;
    }
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException('不能删除自己的账号');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        systemRole: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.systemRole === SystemRole.ADMIN && user.isActive) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          systemRole: SystemRole.ADMIN,
          isActive: true,
        },
      });

      if (activeAdminCount <= 1) {
        throw new ConflictException('不能删除最后一个启用的管理员');
      }
    }

    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('用户不存在');
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException('该用户仍有关联数据，请先转移其负责的项目');
      }
      throw error;
    }
  }

  async findAllOptions() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        systemRole: true,
        isActive: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        tokenVersion: {
          increment: 1,
        },
      },
    });
  }

  async updateStatus(
    id: string,
    currentUserId: string,
    dto: UpdateUserStatusDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        systemRole: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 状态相同，按幂等操作直接成功
    if (user.isActive === dto.isActive) {
      return;
    }

    if (!dto.isActive && id === currentUserId) {
      throw new BadRequestException('不能停用自己的账号');
    }

    if (!dto.isActive && user.systemRole === SystemRole.ADMIN) {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          systemRole: SystemRole.ADMIN,
          isActive: true,
        },
      });

      if (activeAdminCount <= 1) {
        throw new ConflictException('不能停用最后一个管理员');
      }
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        // 停用时让用户所有现有 JWT 立即失效
        ...(!dto.isActive
          ? {
              tokenVersion: {
                increment: 1,
              },
            }
          : {}),
      },
    });
  }
}
