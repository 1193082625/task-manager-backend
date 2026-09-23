import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class LoginResponseDto {
  @ApiProperty({
    description: '用于访问受保护接口的 JWT',
  })
  token!: string;

  @ApiProperty({
    type: UserResponseDto,
  })
  user!: UserResponseDto;
}
