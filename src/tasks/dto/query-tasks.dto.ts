import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { WorkStatus } from '../../generated/prisma/enums.js';

export class QueryTasksDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    description: '任务名称模糊搜索',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({
    description: '所属项目ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: '负责人ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  principalId?: string;

  @ApiPropertyOptional({ enum: WorkStatus })
  @IsOptional()
  @IsEnum(WorkStatus)
  status?: WorkStatus;

  @ApiPropertyOptional({
    description: '筛选开始日期，按北京时间，与任务计划区间求交集',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  startTime?: string;

  @ApiPropertyOptional({
    description: '筛选结束日期，包含北京时间当天',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  endTime?: string;

  @ApiPropertyOptional({
    description: '排序字段，与order一起提供',
    enum: ['startTime', 'endTime', 'realStartTime', 'realEndTime'],
  })
  @IsOptional()
  @IsIn(['startTime', 'endTime', 'realStartTime', 'realEndTime'])
  orderby?: 'startTime' | 'endTime' | 'realStartTime' | 'realEndTime';

  @ApiPropertyOptional({
    description: '排序方向，与 orderby 一起提供',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
