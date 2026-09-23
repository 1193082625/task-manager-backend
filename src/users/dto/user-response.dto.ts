import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: '用户 ID',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({ example: '张三' })
  name!: string;

  @ApiProperty({ example: '13800138000' })
  phone!: string;

  @ApiProperty({ example: 'developer' })
  role!: string;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  list!: UserResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;
}
