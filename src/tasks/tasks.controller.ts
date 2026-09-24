import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import {
  TaskListResponseDto,
  TaskResponseDto,
} from './dto/task-response.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import { QueryTasksDto } from './dto/query-tasks.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';

@ApiTags('任务管理')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: '创建任务' })
  @ApiCreatedResponse({ description: '任务创建成功', type: TaskResponseDto })
  @ApiBadRequestResponse({
    description: '参数不合法、日期顺序错误或关联对象不存在',
  })
  create(@CurrentUserId() currentUserId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto, currentUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询任务详情' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiBadRequestResponse({ description: '任务 ID 格式不正确' })
  @ApiNotFoundResponse({ description: '任务不存在' })
  @ApiForbiddenResponse({ description: '当前用户无权查看该任务' })
  findOne(
    @CurrentUserId() currentUserId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.tasksService.findOne(id, currentUserId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '变更任务状态' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiBadRequestResponse({ description: ' ID 或状态参数不合法' })
  @ApiNotFoundResponse({ description: '任务不存在' })
  @ApiConflictResponse({
    description: '状态转换不允许、时间数据异常或并发修改冲突',
  })
  @ApiForbiddenResponse({
    description: '只有项目负责人或任务负责人可以变更状态',
  })
  updateStatus(
    @CurrentUserId() currentUserId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(id, dto, currentUserId);
  }

  @Get()
  @ApiOperation({
    summary: '分页查询任务',
    description:
      '支持分页、名称、项目、负责人、状态、北京时间日期区间交集筛选及时间排序。',
  })
  @ApiOkResponse({ type: TaskListResponseDto })
  @ApiBadRequestResponse({ description: '查询参数不合法' })
  findAll(
    @CurrentUserId() currentUserId: string,
    @Query() query: QueryTasksDto,
  ) {
    return this.tasksService.findAll(query, currentUserId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '编辑任务',
    description: '修改普通字段，不允许直接修改状态和实际时间',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiBadRequestResponse({
    description: '参数不合法、日期顺序错误或关联对象不存在',
  })
  @ApiNotFoundResponse({ description: '任务不存在' })
  @ApiConflictResponse({ description: '并发修改冲突，请刷新后重试' })
  @ApiForbiddenResponse({ description: '当前用户无权编辑任务或修改任务归属' })
  update(
    @CurrentUserId() currentUserId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, dto, currentUserId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除任务' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiNoContentResponse({ description: '删除成功，无响应体' })
  @ApiBadRequestResponse({ description: '任务 ID 格式不正确' })
  @ApiNotFoundResponse({ description: '任务不存在' })
  @ApiForbiddenResponse({ description: '当前用户无权删除任务' })
  async remove(
    @CurrentUserId() currentUserId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.tasksService.remove(id, currentUserId);
  }
}
