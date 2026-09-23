import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.js';
import type { Type } from '@nestjs/common';

// 类型层面排除 password
type UpdateUserFields = Omit<CreateUserDto, 'password'>;

// Swagger/校验元数据层面排除 password
const UpdateUserFieldsDto: Type<UpdateUserFields> = OmitType(CreateUserDto, [
  'password',
] as const);

// 把剩余字段变成可选字段
const PartialUpdateUserDto: Type<Partial<UpdateUserFields>> = PartialType(
  UpdateUserFieldsDto,
  {
    skipNullProperties: false,
  },
);

export class UpdateUserDto extends PartialUpdateUserDto {}
