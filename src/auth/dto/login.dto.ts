import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: '登录手机号',
    example: '18899000000',
  })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, {
    message: '请输入正确的手机号',
  })
  phone!: string;

  @ApiProperty({
    description: '登录密码',
    example: 'Task1234',
    minLength: 8,
    maxLength: 128,
    writeOnly: true,
  })
  @IsString()
  @MinLength(8, { message: '密码不能少于 8 个字符' })
  @MaxLength(128, { message: '密码不能超过 128 个字符' })
  password!: string;
}
