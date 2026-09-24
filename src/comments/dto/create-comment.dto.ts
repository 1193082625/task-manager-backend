import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: '评论内容',
    example: '接口已经完成，可以开始联调',
    maxLength: 2000,
  })
  @IsString()
  @Matches(/\S/, {
    message: '评论内容不能为空或全为空格',
  })
  @MaxLength(2000, {
    message: '评论内容不能超过 2000 个字符',
  })
  content!: string;
}
