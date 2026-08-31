import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { CreateUserDto, LoginUserDto, UpdateUserDto } from './dto/user';

import { PrismaService } from '../prisma/prisma.service';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../config/mail/MailService';

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

  async findById(id: number) {
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

  async updateUser(id: number, data: UpdateUserDto) {
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
}
