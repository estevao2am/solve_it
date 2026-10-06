import {
  Body,
  Controller,
  Get,
  HttpCode,
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
  CompleteOnboardingDto,
  CreateUserDto,
  EmailDto,
  LoginUserDto,
  RefreshTokenDto,
  ResetPasswordDto,
  UpdateUserDto,
  VerifyResetCodeDto,
} from './dto/user';

import { UsersService } from './users.service';
import { PasswordResetService } from './password-reset.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './decorator/current-user.decorator';
import { multerConfig } from '../config/multer';

@Controller('users')
export class UsersController {
  constructor(
    private usersServices: UsersService,
    private passwordResetService: PasswordResetService,
  ) {}

  // Criar utilizador
  @Post('/')
  async createUser(@Body() body: CreateUserDto) {
    return await this.usersServices.createUser(body);
  }

  // Criar conta: o e-mail ainda está livre?
  @Post('/email-available')
  @HttpCode(200)
  async isEmailAvailable(@Body() body: EmailDto) {
    return await this.usersServices.isEmailAvailable(body.email);
  }

  // Recuperar palavra-passe: 1) pedir código, 2) confirmar, 3) trocar
  @Post('/password/forgot')
  @HttpCode(200)
  async forgotPassword(@Body() body: EmailDto) {
    return await this.passwordResetService.requestCode(body.email);
  }

  @Post('/password/verify-code')
  @HttpCode(200)
  async verifyResetCode(@Body() body: VerifyResetCodeDto) {
    return await this.passwordResetService.verifyCode(body.email, body.code);
  }

  @Post('/password/reset')
  @HttpCode(200)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.passwordResetService.resetPassword(
      body.email,
      body.code,
      body.new_password,
    );
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

  // Terminar a configuração inicial da conta (onboarding)
  @UseGuards(AuthGuard)
  @Patch('/me/onboarding')
  async completeOnboarding(
    @CurrentUser() user: { sub: string },
    @Body() body: CompleteOnboardingDto,
  ) {
    return await this.usersServices.completeOnboarding(user.sub, body);
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
