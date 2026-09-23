import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    description: '项目名称',
    example: '穿搭APP',
    maxLength: 100,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/, { message: '项目名称不能为空或全为空格' })
  @MaxLength(100, { message: '名称不能超过 100 个字符' })
  name!: string;

  @ApiPropertyOptional({
    description: '项目介绍',
    example: '管理个人衣橱',
    maxLength: 200,
  })
  // 可以不传，也可以传空字符串，但不能传 null
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(200, { message: '项目描述不能超过 200 个字符' })
  description?: string;

  @ApiProperty({
    description: '项目负责人ID，请从用户列表获取',
    format: 'uuid',
  })
  @IsUUID()
  principalId!: string;

  @ApiProperty({
    description: '计划开始时间',
    type: String,
    format: 'date',
    example: '2026-09-21',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '开始日期格式必须为 YYYY-MM-DD',
  })
  @IsDateString({ strict: true }, { message: '开始日期必须是有效日期' })
  startTime!: string;

  @ApiProperty({
    description: '计划结束时间',
    type: String,
    format: 'date',
    example: '2026-10-21',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: '结束日期格式必须为 YYYY-MM-DD',
  })
  @IsDateString({ strict: true }, { message: '结束日期必须是有效日期' })
  endTime!: string;
}
