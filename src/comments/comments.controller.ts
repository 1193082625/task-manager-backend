import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service.js';
import { CommentResponseDto } from './dto/comment-response.dto.js';
import { CurrentUserId } from '../auth/current-user-id.decorator.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';

@ApiTags('评论管理')
@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: '添加任务评论' })
  @ApiCreatedResponse({ description: '评论添加成功', type: CommentResponseDto })
  @ApiBadRequestResponse({
    description: '参数不合法',
  })
  create(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUserId() creatorId: string,
  ) {
    return this.commentsService.create(taskId, dto, creatorId);
  }

  @Get()
  @ApiOperation({ summary: '查询所有评论' })
  @ApiOkResponse({
    type: CommentResponseDto,
    isArray: true,
  })
  findAll(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @CurrentUserId() currentUserId: string,
  ) {
    return this.commentsService.findAll(taskId, currentUserId);
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除自己的评论' })
  @ApiNoContentResponse({
    description: '评论删除成功',
  })
  @ApiNotFoundResponse({
    description: '任务或评论不存在',
  })
  @ApiForbiddenResponse({
    description: '无权访问任务，或不是评论作者',
  })
  remove(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @CurrentUserId() currentUserId: string,
  ) {
    return this.commentsService.remove(taskId, commentId, currentUserId);
  }
}
