import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  ParseUUIDPipe,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiNoContentResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import {
  UserListResponseDto,
  UserResponseDto,
} from './dto/user-response.dto.js';
import { QueryUsersDto } from './dto/query.users.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Roles } from '../auth/roles.decorator.js';
import { SystemRole } from '../generated/prisma/enums.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

@ApiTags('用户管理')
@Roles(SystemRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: '查询用户列表',
    description: '当前返回全部用户，支持分页，以及姓名和手机号的组合模糊筛选。',
  })
  @ApiOkResponse({ type: UserListResponseDto })
  @ApiBadRequestResponse({ description: '查询参数不合法' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: '请求参数不合法' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // 要放在动态路由前，先匹配
  @Get('all')
  @Roles(SystemRole.USER, SystemRole.ADMIN)
  @ApiOperation({ summary: '查询负责任下拉选项' })
  @ApiOkResponse({
    type: UserResponseDto,
    isArray: true,
  })
  findAllOptions() {
    return this.usersService.findAllOptions();
  }

  @Get(':id')
  @ApiOperation({ summary: '查询用户详情' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: '用户 ID 格式不正确' })
  @ApiNotFoundResponse({ description: '用户不存在' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新用户' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'ID 或更新参数不合法' })
  @ApiNotFoundResponse({ description: '用户不存在' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除用户' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiNoContentResponse({ description: '删除成功，无响应体' })
  @ApiBadRequestResponse({ description: '用户 ID 格式不正确' })
  @ApiNotFoundResponse({ description: '用户不存在' })
  @ApiConflictResponse({ description: '用户仍有关联数据，无法删除' })
  @ApiBadRequestResponse({
    description: '用户 ID 不合法，或试图删除自己的账号',
  })
  @ApiConflictResponse({
    description: '用户仍有关联数据，或是最后一个启用的管理员',
  })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUserId() currentUserId: string,
  ): Promise<void> {
    await this.usersService.remove(id, currentUserId);
  }

  @Patch(':id/reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '管理员重置用户密码' })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
  })
  @ApiNoContentResponse({
    description: '密码重置成功，用户现有登录状态全部失效',
  })
  @ApiBadRequestResponse({
    description: '用户 ID 或新密码格式不正确',
  })
  @ApiUnauthorizedResponse({
    description: '未登录或 Token 已失效',
  })
  @ApiForbiddenResponse({
    description: '只有管理员可以重置密码',
  })
  @ApiNotFoundResponse({
    description: '用户不存在',
  })
  async resetPassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    await this.usersService.resetPassword(id, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '启用或停用用户账号' })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
  })
  @ApiNoContentResponse({
    description: '账号状态修改成功',
  })
  @ApiBadRequestResponse({
    description: '参数错误，或试图停用自己的账号',
  })
  @ApiConflictResponse({
    description: '不能停用最后一个管理员',
  })
  @ApiNotFoundResponse({
    description: '用户不存在',
  })
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUserId() currentUserId: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<void> {
    await this.usersService.updateStatus(id, currentUserId, dto);
  }
}
