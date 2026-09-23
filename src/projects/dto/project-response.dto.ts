import { ApiProperty } from '@nestjs/swagger';
import { ProjectStage, WorkStatus } from '../../generated/prisma/enums.js';

export class ProjectResponseDto {
  @ApiProperty({
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: '穿搭 APP' })
  name!: string;

  @ApiProperty({ example: '管理个人衣橱' })
  description!: string;

  @ApiProperty({ description: '负责人 ID', format: 'uuid' })
  principalId!: string;

  @ApiProperty({ enum: ProjectStage, example: 'setup' })
  stage!: ProjectStage;

  @ApiProperty({ enum: WorkStatus, example: 'notStarted' })
  status!: WorkStatus;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-09-21',
  })
  startTime!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-10-21',
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

  @ApiProperty({
    description: '项目任务总数，包含取消任务',
    example: 3,
  })
  taskCount!: number;

  @ApiProperty({
    description: '已完成任务数量',
    example: 1,
  })
  completedTaskCount!: number;

  @ApiProperty({
    description: '任务负责人去重后的用户 ID',
    type: [String],
    example: [],
  })
  memberIds!: string[];
}

export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] })
  list!: ProjectResponseDto[];

  @ApiProperty({ example: 12 })
  total!: number;
}
