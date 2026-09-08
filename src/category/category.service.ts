import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/category';
import { Readable } from 'node:stream';

import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CategoryService {
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

  async createCategory(
    data: CreateCategoryDto,
    files?: {
      imageUrl?: Express.Multer.File[];
    },
  ) {
    const categoryAlreadyExists = await this.prismaService.category.findUnique({
      where: {
        name: data.name,
      },
    });
    if (categoryAlreadyExists) {
      throw new UnauthorizedException('Category already exists');
    }

    let imageUrl: string | undefined;

    const uploadFile = async (
      file: Express.Multer.File,
      publicIdSuffix: string,
    ) => {
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'category',
            resource_type: 'image',
            public_id: `${Date.now()}-${publicIdSuffix}`,
          },
          (error, res) => {
            if (error) return reject(new Error(error.message));
            resolve(res);
          },
        );

        Readable.from(file.buffer).pipe(uploadStream);
      });

      return result.secure_url as string;
    };

    if (files?.imageUrl && files.imageUrl[0]) {
      imageUrl = await uploadFile(files.imageUrl[0], 'profile');
    }

    const category = await this.prismaService.category.create({
      data: {
        ...data,
        imageUrl: imageUrl,
      },
    });

    return category;
  }

  async GetAllCategories() {
    const getCategory = await this.prismaService.category.findMany();
    return getCategory;
  }
}
