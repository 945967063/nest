import {
  Injectable,
  Logger,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { md5 } from '../utils';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginUserVo } from './vo/login-user.vo';
@Injectable()
export class UserService {
  @Inject(RedisService)
  private readonly redisService: RedisService;

  private logger = new Logger();
  @InjectRepository(User)
  private readonly userRepository: Repository<User>;

  @InjectRepository(Role)
  private readonly roleRepository: Repository<Role>;

  @InjectRepository(Permission)
  private readonly permissionRepository: Repository<Permission>;

  /**注册 */
  async register(user: RegisterUserDto) {
    const captcha = await this.redisService.get(`captcha_${user.email}`);
    if (!captcha) {
      throw new HttpException('验证码已过期', HttpStatus.BAD_REQUEST);
    }

    if (captcha !== user.captcha) {
      throw new HttpException('验证码错误', HttpStatus.BAD_REQUEST);
    }

    const foundUser = await this.userRepository.findOneBy({
      userName: user.userName,
    });

    if (foundUser) {
      throw new HttpException('用户名已存在', HttpStatus.BAD_REQUEST);
    }

    const newUser = new User();
    newUser.userName = user.userName;
    newUser.passWord = md5(user.passWord);
    newUser.email = user.email;
    newUser.nickName = user.nickName;
    //绑定默认角色
    const defaultRole = await this.roleRepository.findOne({
      where: {
        name: '普通用户',
      },
      relations: ['permissions'],
    });
    const defaultPermissions = await this.permissionRepository.find({
      where: {
        description: '普通用户',
      },
    });
    defaultRole.permissions = defaultPermissions;
    newUser.roles = [defaultRole];

    try {
      await this.userRepository.save(newUser);
      return {
        code: 200,
        message: '注册成功',
      };
    } catch (error) {
      this.logger.error(error, UserService);
      return '注册失败';
    }
  }

  /**登录 */
  async login(LoginUserDto: LoginUserDto) {
    const user = await this.userRepository.findOne({
      where: {
        userName: LoginUserDto.userName,
      },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new HttpException('用户名不存在', HttpStatus.BAD_REQUEST);
    }

    if (user.passWord !== md5(LoginUserDto.passWord)) {
      throw new HttpException('密码错误', HttpStatus.BAD_REQUEST);
    }
    const vo = new LoginUserVo();
    vo.userInfo = {
      id: user.id,
      userName: user.userName,
      nickName: user.nickName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      headPic: user.headPic,
      createTime: user.createTime.getTime(),
      isFrozen: user.isFrozen,
      isAdmin: user.isAdmin,
      roles: user.roles.map((item) => item.name),
      permissions: user.roles.reduce((arr, item) => {
        item.permissions.forEach((permission) => {
          if (arr.indexOf(permission) === -1) {
            arr.push(permission.code);
          }
        });
        return arr;
      }, []),
    };

    return vo;
  }

  async findUserById(userId: number, isAdmin: boolean) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        isAdmin,
      },
      relations: ['roles', 'roles.permissions'],
    });

    return {
      id: user.id,
      username: user.userName,
      isAdmin: user.isAdmin,
      roles: user.roles.map((item) => item.name),
      permissions: user.roles.reduce((arr, item) => {
        item.permissions.forEach((permission) => {
          if (arr.indexOf(permission) === -1) {
            arr.push(permission);
          }
        });
        return arr;
      }, []),
    };
  }
}
