import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  ChangePasswordDto,
  CreateUserDto,
  LoginUserDto,
  UpdateUserDto,
} from './dto/user';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../config/mail/MailService';
import { Readable } from 'stream';
import { createHash, randomBytes } from 'crypto';
import cloudinary from '../config/cloudinary ';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createUser(data: CreateUserDto) {
    const userAlreadyExists = await this.prismaService.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (userAlreadyExists) {
      throw new UnauthorizedException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password_hash, 10);

    const user = await this.prismaService.user.create({
      data: {
        ...data,
        password_hash: hashedPassword,
      },
    });

    // Enviar email depois de criar o utilizador
    await this.mailService.sendWelcomeEmail(user.email, user.first_name);

    // Nunca retornar a password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async loginUser(data: LoginUserDto) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      data.password_hash,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user.id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async refreshToken(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const storedToken = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (
      !storedToken ||
      storedToken.isRevoked ||
      storedToken.expiresIn <= new Date()
    ) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const tokens = await this.createTokens(storedToken.userId);

    const rotation = await this.prismaService.refreshToken.updateMany({
      where: {
        id: storedToken.id,
        tokenHash,
        isRevoked: false,
        expiresIn: { gt: new Date() },
      },
      data: {
        tokenHash: this.hashRefreshToken(tokens.refresh_token),
        expiresIn: tokens.refresh_token_expires_at,
        isRevoked: false,
      },
    });

    if (rotation.count !== 1) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }

  private async issueTokens(userId: string) {
    const tokens = await this.createTokens(userId);

    await this.prismaService.refreshToken.upsert({
      where: { userId },
      create: {
        userId,
        tokenHash: this.hashRefreshToken(tokens.refresh_token),
        expiresIn: tokens.refresh_token_expires_at,
      },
      update: {
        tokenHash: this.hashRefreshToken(tokens.refresh_token),
        expiresIn: tokens.refresh_token_expires_at,
        isRevoked: false,
      },
    });

    return tokens;
  }

  private async createTokens(userId: string) {
    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenExpiresAt = new Date(
      Date.now() +
        this.getDurationInMilliseconds('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
    const accessToken = await this.jwtService.signAsync({ sub: userId });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      refresh_token_expires_at: refreshTokenExpiresAt,
    };
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private getDurationInMilliseconds(name: string, fallback: string) {
    const value = this.configService.get<string>(name) ?? fallback;
    const match = /^(\d+)([smhd])$/.exec(value);

    if (!match) {
      throw new Error(`${name} must use a duration such as 15m, 1h, or 7d`);
    }

    const amount = Number(match[1]);
    const millisecondsByUnit: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    const unitMilliseconds = millisecondsByUnit[match[2]];

    return amount * unitMilliseconds;
  }

  async findById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },

      omit: {
        password_hash: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async updateUser(id: string, data: UpdateUserDto) {
    const findUser = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });

    if (!findUser) {
      throw new NotFoundException('User not found');
    }

    return this.prismaService.user.update({
      where: {
        id,
      },
      data,
    });
  }

  async uploadAvatar(id: string, file: Express.Multer.File) {
    const findUser = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });

    if (!findUser) {
      throw new NotFoundException('User not found');
    }

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      // Upload to Cloudinary using stream
      const cloudinaryUpload = await new Promise<{
        secure_url: string;
        [key: string]: any;
      }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'user_avatars',
            resource_type: 'auto',
          },
          (error: any, result: any) => {
            if (error) {
              reject(
                new Error(
                  error instanceof Error ? error.message : 'Upload failed',
                ),
              );
            } else {
              resolve(result as { secure_url: string; [key: string]: any });
            }
          },
        );

        // Convert buffer to stream and pipe to Cloudinary
        const stream = Readable.from(file.buffer);
        stream.pipe(uploadStream);
      });

      // Update user with the avatar URL from Cloudinary
      return this.prismaService.user.update({
        where: {
          id,
        },
        data: {
          avatar_url: cloudinaryUpload.secure_url,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to upload avatar: ${errorMessage}`);
    }
  }

  async removeAvatar(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.avatar_url) {
      throw new BadRequestException('User does not have an avatar');
    }

    try {
      // Extrair o public_id a partir do URL do Cloudinary
      const uploadIndex = user.avatar_url.indexOf('/upload/');

      if (uploadIndex !== -1) {
        let publicId = user.avatar_url.substring(
          uploadIndex + '/upload/'.length,
        );

        // Remover a versão do Cloudinary, por exemplo:
        // v1234567890/user_avatars/avatar.jpg
        publicId = publicId.replace(/^v\d+\//, '');

        // Remover extensão
        publicId = publicId.replace(/\.[^/.]+$/, '');

        // Apagar do Cloudinary
        await cloudinary.uploader.destroy(publicId, {
          resource_type: 'image',
        });
      }

      // Limpar avatar na BD
      const updatedUser = await this.prismaService.user.update({
        where: {
          id,
        },
        data: {
          avatar_url: null,
        },
      });

      return updatedUser;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new BadRequestException(`Failed to remove avatar: ${errorMessage}`);
    }
  }

  async updateUserData(id: string, data: UpdateUserDto) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Se estiver a alterar o email, verificar se já pertence a outro utilizador
    if (data.email && data.email !== user.email) {
      const emailAlreadyExists = await this.prismaService.user.findUnique({
        where: {
          email: data.email,
        },
      });

      if (emailAlreadyExists && emailAlreadyExists.id !== id) {
        throw new BadRequestException(
          'Este email já está associado a outro utilizador',
        );
      }
    }

    const updatedUser = await this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        ...(data.first_name !== undefined && {
          first_name: data.first_name,
        }),

        ...(data.last_name !== undefined && {
          last_name: data.last_name,
        }),

        ...(data.phone !== undefined && {
          phone: data.phone,
        }),

        ...(data.email !== undefined && {
          email: data.email,
        }),
      },
    });

    // Nunca devolver a password
    const { password_hash, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword;
  }

  async changePassword(id: string, data: ChangePasswordDto) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    const passwordIsValid = await bcrypt.compare(
      data.current_password,
      user.password_hash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('A palavra-passe atual está incorreta');
    }

    const samePassword = await bcrypt.compare(
      data.new_password,
      user.password_hash,
    );

    if (samePassword) {
      throw new BadRequestException(
        'A nova palavra-passe deve ser diferente da atual',
      );
    }

    const newPasswordHash = await bcrypt.hash(data.new_password, 10);

    await this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        password_hash: newPasswordHash,
      },
    });

    return {
      message: 'Palavra-passe alterada com sucesso',
    };
  }
}
