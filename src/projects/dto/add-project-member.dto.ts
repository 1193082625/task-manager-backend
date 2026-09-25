import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddProjectMemberDto {
  @ApiProperty({
    description: '要添加的用户 ID',
    format: 'uuid',
  })
  @IsUUID('4', {
    message: '用户 ID 格式不正确',
  })
  userId!: string;
}
