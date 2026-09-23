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
import { ProjectStage, WorkStatus } from '../../generated/prisma/enums.js';

export class QueryProjectsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    description: '项目名称模糊搜索',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: '负责人 ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  principalId?: string;

  @ApiPropertyOptional({ enum: ProjectStage })
  @IsOptional()
  @IsEnum(ProjectStage)
  stage?: ProjectStage;

  @ApiPropertyOptional({ enum: WorkStatus })
  @IsOptional()
  @IsEnum(WorkStatus)
  status?: WorkStatus;

  @ApiPropertyOptional({
    description: '筛选区间开始时间，与项目计划区间有交集即可',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  startTime?: string;

  @ApiPropertyOptional({
    description: '筛选区间结束日期，与项目计划区间有交集即可',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  endTime?: string;

  @ApiPropertyOptional({
    description: '排序字段，与 order 一起传入；taskCount 按任务总数排序',
    enum: ['startTime', 'endTime', 'realStartTime', 'realEndTime', 'taskCount'],
  })
  @IsOptional()
  @IsIn(['startTime', 'endTime', 'realStartTime', 'realEndTime', 'taskCount'])
  orderby?:
    'startTime' | 'endTime' | 'realStartTime' | 'realEndTime' | 'taskCount';

  @ApiPropertyOptional({
    description: '排序方向，与 orderby 一起传入',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
