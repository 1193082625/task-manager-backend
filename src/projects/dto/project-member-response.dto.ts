import { ApiProperty } from '@nestjs/swagger';

export class ProjectMemberResponseDto {
  @ApiProperty({
    description: '成员用户 ID',
    format: 'uuid',
  })
  userId!: string;

  @ApiProperty({
    example: '张三',
  })
  name!: string;

  @ApiProperty({
    example: 'developer',
  })
  role!: string;

  @ApiProperty({
    description: '账号是否启用',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: '是否为当前项目负责人',
    example: false,
  })
  isPrincipal!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  joinedAt!: string;
}
