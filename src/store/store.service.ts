import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Readable } from 'node:stream';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/store';

@Injectable()
export class StoresService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async createStore(
    data: CreateStoreDto,
    userId: number,
    files?: {
      profile_image?: Express.Multer.File[];
      cover_image?: Express.Multer.File[];
    },
  ) {
    const existingStore = await this.prismaService.store.findUnique({
      where: {
        owner_id: userId,
      },
    });

    if (existingStore) {
      throw new ConflictException('O usuário já possui uma loja');
    }
    // Upload images if provided
    let profileUrl: string | undefined;
    let coverUrl: string | undefined;

    const uploadFile = async (
      file: Express.Multer.File,
      publicIdSuffix: string,
    ) => {
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'stores',
            resource_type: 'image',
            public_id: `${Date.now()}-${publicIdSuffix}`,
          },
          (error, res) => {
            if (error) return reject(error);
            resolve(res);
          },
        );

        Readable.from(file.buffer).pipe(uploadStream);
      });

      return result.secure_url as string;
    };

    if (files?.profile_image && files.profile_image[0]) {
      profileUrl = await uploadFile(files.profile_image[0], 'profile');
    }

    if (files?.cover_image && files.cover_image[0]) {
      coverUrl = await uploadFile(files.cover_image[0], 'cover');
    }

    return this.prismaService.store.create({
      data: {
        ...data,

        profile_image: profileUrl,
        cover_image: coverUrl,

        owner: {
          connect: {
            id: userId,
          },
        },
      },

      include: {
        owner: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image_url: true,
            stock: true,
          },
        },
      },
    });
  }

  async findById(id: number) {
    const store = await this.prismaService.store.findUnique({
      where: {
        id,
      },

      include: {
        owner: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }

    return store;
  }

  async findMyStore(userId: number) {
    const store = await this.prismaService.store.findUnique({
      where: {
        owner_id: userId,
      },

      include: {
        owner: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            image_url: true,
            stock: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Você ainda não possui uma loja');
    }

    return store;
  }
}
