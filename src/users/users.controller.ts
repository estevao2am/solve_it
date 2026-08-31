import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto, LoginUserDto, UpdateUserDto } from './dto/user';
import { UsersService } from './users.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './decorator/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersServices: UsersService) {}

  @Post('/')
  async createUser(@Body() body: CreateUserDto) {
    return await this.usersServices.createUser(body);
  }

  @Post('/login')
  async loginUser(@Body() body: LoginUserDto) {
    return await this.usersServices.loginUser(body);
  }

  // Endpoint to get the current authenticated user's information
  @UseGuards(AuthGuard)
  @Get('/me')
  async me(@CurrentUser() user: { sub: number }) {
    return await this.usersServices.findById(user.sub);
  }

  // Endpoint to get the other user's information

  @UseGuards(AuthGuard)
  @Get(':id')
  async findUsersById(@Param('id', ParseIntPipe) id: number) {
    return await this.usersServices.findById(id);
  }

  // @UseGuards(AuthGuard)
  // @Patch('/:id')
  // async updateUser(
  //   @Param('id', ParseIntPipe) id: number,
  //   @CurrentUser() user: { sub: number },
  //   @Body() body: UpdateUserDto,
  // ) {
  //   if (id !== user.sub) {
  //     throw new ForbiddenException('You can only update your own profile');
  //   }

  //   return await this.usersServices.updateUser(id, body);
  // }

  @UseGuards(AuthGuard)
  @Patch('/me')
  async updateMe(
    @CurrentUser() user: { sub: number },
    @Body() body: UpdateUserDto,
  ) {
    return await this.usersServices.updateUser(user.sub, body);
  }
}
