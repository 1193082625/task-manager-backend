import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: '管理员设置的新密码',
    minLength: 8,
    maxLength: 128,
    writeOnly: true,
  })
  @IsString()
  @Matches(/\S/, {
    message: '新密码不能为空或全为空格',
  })
  @MinLength(8, { message: '新密码不能少于 8 个字符' })
  @MaxLength(128, { message: '新密码不能超过 128 个字符' })
  newPassword!: string;
}
