import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateUserDto, LoginUserDto, UpdateUserDto } from './dto/user';
import { UsersService } from './users.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './decorator/current-user.decorator';
import { multerConfig } from '../config/multer';

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
  async me(@CurrentUser() user: { sub: string }) {
    return await this.usersServices.findById(user.sub);
  }

  // Endpoint to get the other user's information

  @UseGuards(AuthGuard)
  @Get(':id')
  async findUsersById(@Param('id') id: string) {
    return await this.usersServices.findById(id);
  }

  // @UseGuards(AuthGuard)
  // @Patch('/:id')
  // async updateUser(
  //   @Param('id', ParseIntPipe) id: string,
  //   @CurrentUser() user: { sub: string },
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
    @CurrentUser() user: { sub: string },
    @Body() body: UpdateUserDto,
  ) {
    return await this.usersServices.updateUser(user.sub, body);
  }

  @UseGuards(AuthGuard)
  @Post('/me/avatar')
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  async uploadAvatar(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.usersServices.uploadAvatar(user.sub, file);
  }
}
