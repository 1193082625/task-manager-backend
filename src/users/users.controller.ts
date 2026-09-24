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
} from '@nestjs/swagger';
import {
  UserListResponseDto,
  UserResponseDto,
} from './dto/user-response.dto.js';
import { QueryUsersDto } from './dto/query.users.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Roles } from '../auth/roles.decorator.js';
import { SystemRole } from '../generated/prisma/enums.js';

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
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.usersService.remove(id);
  }
}
