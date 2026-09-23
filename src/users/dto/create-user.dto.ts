import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// DTO 描述接口允许接收什么数据
export class CreateUserDto {
  @ApiProperty({
    description: '成员姓名',
    example: '张三',
    maxLength: 60,
    pattern: '\\S',
  })
  @IsString()
  @Matches(/\S/, { message: '姓名不能为空或全为空格' })
  @MaxLength(60, { message: '姓名不能超过 60 个字符' })
  name!: string;

  @ApiProperty({
    description: '手机号',
    example: '13800000000',
    pattern: '^1[3-9]\\d{9}$',
  })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, {
    message: '请输入正确的手机号',
  })
  phone!: string;

  @ApiProperty({
    description: '初始登录密码',
    example: 'Task1234',
    minLength: 8,
    maxLength: 128,
    writeOnly: true,
  })
  @IsString()
  @Matches(/\S/, { message: '密码不能为空或全为空格' })
  @MinLength(8, { message: '密码不能少于 8 个字符' })
  @MaxLength(128, { message: '密码不能超过 128 个字符' })
  password!: string;

  @ApiProperty({
    description: '成员角色',
    enum: ['designer', 'developer', 'test'],
    example: 'developer',
  })
  @IsString()
  @IsIn(['designer', 'developer', 'test'], {
    message: '角色必须是 designer、developer 或 test',
  })
  role!: string;
}
