import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: '账号是否启用',
    example: false,
  })
  @IsBoolean({
    message: 'isActive 必须是布尔值',
  })
  isActive!: boolean;
}
