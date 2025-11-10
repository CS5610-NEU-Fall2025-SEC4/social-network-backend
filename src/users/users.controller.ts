import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    email: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<{ message: string; user: { username: string; email: string } }> {
    return this.usersService.createUser(createUserDto);
  }

  @Post('login')
  async login(
    @Body() loginUserDto: LoginUserDto,
  ): Promise<{ message: string; access_token: string }> {
    return this.usersService.checkUser(loginUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('isAuthenticated')
  checkAuth(@Request() req: AuthenticatedRequest) {
    return {
      authenticated: true,
      userId: req.user.userId,
      username: req.user.username,
    };
  }
}
