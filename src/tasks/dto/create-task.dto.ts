import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({
    description: '任务名称',
    example: '完成登录页面',
    maxLength: 60,
  })
  @IsString()
  @Matches(/\S/, { message: '任务名称不能为空或全为空格' })
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({
    description: '任务介绍',
    example: '实现登录表单和校验',
    maxLength: 200,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({
    description: '任务负责人 ID',
    format: 'uuid',
  })
  @IsUUID()
  principalId!: string;

  @ApiPropertyOptional({
    description: '所属项目 ID， 不传或传 null 表示独立任务',
    type: String,
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @ApiProperty({
    description: '计划开始时刻，必须包含秒和时区',
    type: String,
    format: 'date-time',
    example: '2026-09-22T09:00:00+08:00',
  })
  @IsString()
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/,
    { message: '开始时间必须包含日期、时分秒和时区' },
  )
  @IsDateString(
    { strict: true, strictSeparator: true },
    { message: '开始时间必须是有效时间' },
  )
  startTime!: string;

  @ApiProperty({
    description: '计划结束时刻，必须包含秒和时区',
    type: String,
    format: 'date-time',
    example: '2026-09-22T18:00:00+08:00',
  })
  @IsString()
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/,
    { message: '结束时间必须包含日期、时分秒和时区' },
  )
  @IsDateString(
    { strict: true, strictSeparator: true },
    { message: '结束时间必须是有效时间' },
  )
  endTime!: string;
}
