import { ApiProperty } from '@nestjs/swagger';
import { WorkStatus } from '../../generated/prisma/enums.js';
import { IsEnum } from 'class-validator';

export class UpdateTaskStatusDto {
  @ApiProperty({
    description: '目标状态',
    enum: WorkStatus,
    example: 'doing',
  })
  @IsEnum(WorkStatus)
  status!: WorkStatus;
}
