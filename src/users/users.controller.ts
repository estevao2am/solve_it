import {
  Body,
  Controller,
  Get,
  Param,
  Delete,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import {
  ChangePasswordDto,
  CreateUserDto,
  LoginUserDto,
  RefreshTokenDto,
  UpdateUserDto,
} from './dto/user';

import { UsersService } from './users.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './decorator/current-user.decorator';
import { multerConfig } from '../config/multer';

@Controller('users')
export class UsersController {
  constructor(private usersServices: UsersService) {}

  // Criar utilizador
  @Post('/')
  async createUser(@Body() body: CreateUserDto) {
    return await this.usersServices.createUser(body);
  }

  // Login
  @Post('/login')
  async loginUser(@Body() body: LoginUserDto) {
    return await this.usersServices.loginUser(body);
  }

  // Refresh token
  @Post('/refresh')
  async refreshToken(@Body() body: RefreshTokenDto) {
    return await this.usersServices.refreshToken(body.refresh_token);
  }

  // Obter o utilizador autenticado
  @UseGuards(AuthGuard)
  @Get('/me')
  async me(@CurrentUser() user: { sub: string }) {
    return await this.usersServices.findById(user.sub);
  }

  // Obter outro utilizador pelo ID
  @UseGuards(AuthGuard)
  @Get('/:id')
  async findUsersById(@Param('id') id: string) {
    return await this.usersServices.findById(id);
  }

  // Atualizar dados do próprio utilizador
  @UseGuards(AuthGuard)
  @Patch('/me')
  async updateMe(
    @CurrentUser() user: { sub: string },
    @Body() body: UpdateUserDto,
  ) {
    return await this.usersServices.updateUser(user.sub, body);
  }

  // Alterar fotografia
  @UseGuards(AuthGuard)
  @Post('/me/avatar')
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  async uploadAvatar(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.usersServices.uploadAvatar(user.sub, file);
  }

  // Remover fotografia
  @UseGuards(AuthGuard)
  @Delete('/me/avatar')
  async removeAvatar(@CurrentUser() user: { sub: string }) {
    return await this.usersServices.removeAvatar(user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch('/me/password')
  async changePassword(
    @CurrentUser() user: { sub: string },
    @Body() body: ChangePasswordDto,
  ) {
    return await this.usersServices.changePassword(user.sub, body);
  }
}
