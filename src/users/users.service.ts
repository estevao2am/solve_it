import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import { CreateUserDto, LoginUserDto, UpdateUserDto } from './dto/user';

import { PrismaService } from '../prisma/prisma.service';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../config/mail/MailService';
import { Readable } from 'stream';
import cloudinary from '../config/cloudinary ';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
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

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });

    // Enviar email depois de criar o utilizador
    await this.mailService.sendWelcomeEmail(user.email, user.first_name);

    // Nunca retornar a password
    const { password, ...userWithoutPassword } = user;

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

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
    });

    const { password, ...userWithoutPassword } = user;

    return {
      access_token: accessToken,
      user: userWithoutPassword,
    };
  }

  async findById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },

      omit: {
        password: true,
      },

      include: {
        store: {
          select: {
            id: true,
            name: true,
            profile_image: true,
            origin_country: true,
            address: true,
          },
        },
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
            if (error) reject(error);
            else resolve(result);
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
