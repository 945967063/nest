import { IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
  headPic: string;

  @IsNotEmpty({
    message: '用户名不能为空',
  })
  nickName: string;
}
