import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateUserDto, LoginUserDto, UpdateUserDto } from './dto/user';
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
}
