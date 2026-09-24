import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiTags,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import {
  ProjectListResponseDto,
  ProjectResponseDto,
} from './dto/project-response.dto.js';
import { QueryProjectsDto } from './dto/query-projects.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';

@ApiTags('项目管理')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: '创建项目' })
  @ApiCreatedResponse({ description: '项目创建成功', type: ProjectResponseDto })
  @ApiBadRequestResponse({
    description: '参数不合法、日期顺序错误或负责人不存在',
  })
  create(@CurrentUserId() creatorId: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto, creatorId);
  }

  @Get('all')
  @ApiOperation({ summary: '查询项目下拉选项' })
  @ApiOkResponse({
    type: ProjectResponseDto,
    isArray: true,
  })
  findAllOptions(@CurrentUserId() currentUserId: string) {
    return this.projectsService.findAllOptions(currentUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询项目详情' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({ description: '项目 ID 格式不正确' })
  @ApiNotFoundResponse({ description: '项目不存在' })
  @ApiForbiddenResponse({ description: '当前用户不是项目成员' })
  findOne(
    @CurrentUserId() currentUserId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.projectsService.findOne(id, currentUserId);
  }

  @Get()
  @ApiOperation({
    summary: '分页查询项目',
    description:
      '支持分页、名称、负责人、阶段、状态、计划日期区间交集筛选，以及日期字段排序。',
  })
  @ApiOkResponse({ type: ProjectListResponseDto })
  @ApiBadRequestResponse({ description: '查询参数不合法' })
  findAll(
    @CurrentUserId() currentUserId: string,
    @Query() query: QueryProjectsDto,
  ) {
    return this.projectsService.findAll(query, currentUserId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '编辑项目',
    description: '修改基本信息和计划日期，成员及实际时间由任务统计',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({
    description: '参数不合法、日期顺序错误或负责人不存在',
  })
  @ApiNotFoundResponse({ description: '项目不存在' })
  @ApiConflictResponse({ description: '并发修改冲突，请刷新后重试' })
  update(
    @CurrentUserId() currentUserId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, dto, currentUserId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除项目' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiNoContentResponse({ description: '删除成功，无响应体' })
  @ApiBadRequestResponse({ description: '项目 ID 格式不正确' })
  @ApiNotFoundResponse({ description: '项目不存在' })
  @ApiConflictResponse({ description: '项目下仍有任务，不能删除' })
  async remove(
    @CurrentUserId() currentUserId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.projectsService.remove(id, currentUserId);
  }
}
