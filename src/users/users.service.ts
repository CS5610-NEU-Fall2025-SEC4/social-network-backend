import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './users.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  //for registering a user
  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<{ message: string; user: { username: string; email: string } }> {
    const { username, email, password } = createUserDto;

    const existing = await this.userModel.findOne({
      $or: [{ username: username }, { email: email }],
    });

    if (existing) {
      throw new BadRequestException('Username or email already exists');
    }

    // ✅ Generate a salt for hashing
    const saltRounds = 10; // 10 is a safe standard value
    const salt = await bcrypt.genSalt(saltRounds);

    // ✅ Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, salt);

    createUserDto.password = hashedPassword;
    const newUser = await this.userModel.create(createUserDto);

    return {
      message: 'User created successfully',
      user: {
        username: newUser.username,
        email: newUser.email,
      },
    };
  }

  //for logging in a user
  async checkUser(loginUserDto: LoginUserDto): Promise<{
    message: string;
    access_token: string;
  }> {
    const { username, password } = loginUserDto;
    const user = await this.userModel.findOne({ username: username });

    if (!user) {
      throw new BadRequestException('Invalid username or password');
    }
    const isPasswordMatching = await bcrypt.compare(password, user.password);

    if (!isPasswordMatching) {
      throw new BadRequestException('Invalid username or password');
    }

    //TO GENERATE TOKEN
    const payload = { username: user.username, sub: user._id };
    const access_token = this.jwtService.sign(payload);

    return { message: 'Login successful', access_token };
  }
}
