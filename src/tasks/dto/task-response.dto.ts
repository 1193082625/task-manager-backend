import { ApiProperty } from '@nestjs/swagger';
import { WorkStatus } from '../../generated/prisma/enums.js';

export class TaskResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '完成登录页面' })
  name!: string;

  @ApiProperty({ example: '实现登录表单和校验' })
  description!: string;

  @ApiProperty({ description: '负责人 ID', format: 'uuid' })
  principalId: string;

  @ApiProperty({
    description: '所属项目 ID，独立任务为 null',
    type: String,
    format: 'uuid',
    nullable: true,
  })
  projectId!: string | null;

  @ApiProperty({ enum: WorkStatus, example: 'notStarted' })
  status!: WorkStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-09-22T10:00:00.000Z',
  })
  startTime!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-09-22T10:00:00.000Z',
  })
  endTime!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  realStartTime!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  realEndTime!: string | null;
}

export class TaskListResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  list!: TaskResponseDto[];

  @ApiProperty({ example: 12 })
  total!: number;
}
