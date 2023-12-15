import { IsNotEmpty, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  userName: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, {
    message: '密码不能少于 6 位',
  })
  passWord: string;

  @IsNotEmpty({ message: '昵称不能为空' })
  nickName: string;

  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @IsNotEmpty({ message: '验证码不能为空' })
  captcha: string;
}
