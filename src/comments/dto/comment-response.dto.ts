import { ApiProperty } from '@nestjs/swagger';

export class CommentAuthorDto {
  @ApiProperty({
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    example: '张三',
  })
  name!: string;

  @ApiProperty({
    example: 'developer',
  })
  role!: string;
}

export class CommentResponseDto {
  @ApiProperty({
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    format: 'uuid',
  })
  taskId!: string;

  @ApiProperty({
    example: '接口已完成，可以开始链条',
  })
  content!: string;

  @ApiProperty({
    type: CommentAuthorDto,
  })
  author!: CommentAuthorDto;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  createdAt!: string;
}
