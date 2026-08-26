import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product';
import { v2 as cloudinary } from 'cloudinary';
@Injectable()
export class ProductService {
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

  async createProduct(
    data: CreateProductDto,
    userId: number,
    file: Express.Multer.File,
  ) {
    // Verifica se o usuário possui uma loja
    const store = await this.prismaService.store.findUnique({
      where: {
        owner_id: userId,
      },
    });

    if (!store) {
      throw new NotFoundException(
        'Você precisa ter uma loja para criar produtos',
      );
    }

    // Verifica se a categoria existe
    const category = await this.prismaService.category.findUnique({
      where: {
        id: data.category_id,
      },
    });

    if (!category) {
      throw new BadRequestException('Categoria não encontrada');
    }

    // Verifica se recebeu imagem
    if (!file) {
      throw new BadRequestException('A imagem do produto é obrigatória');
    }

    // Upload para o Cloudinary
    let imageUrl: string;

    try {
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'products',
            resource_type: 'image',
            public_id: `${Date.now()}-${file.originalname
              .split('.')[0]
              .replace(/[^a-zA-Z0-9-_]/g, '')}`,
          },
          (error, result) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(result);
          },
        );

        Readable.from(file.buffer).pipe(uploadStream);
      });

      imageUrl = result.secure_url;
    } catch (error) {
      console.error('Cloudinary error:', error);

      throw new InternalServerErrorException('Erro ao fazer upload da imagem');
    }

    // Cria o produto
    return this.prismaService.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        image_url: imageUrl,

        store: {
          connect: {
            id: store.id,
          },
        },

        category: {
          connect: {
            id: category.id,
          },
        },
      },
    });
  }

  async findAllProducts(page = 1) {
    const limit = 10;

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prismaService.product.findMany({
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
      }),

      this.prismaService.product.count(),
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findProductById(id: number) {
    const product = await this.prismaService.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async updateProduct(id: number, data: UpdateProductDto) {
    await this.findProductById(id);

    return await this.prismaService.product.update({
      where: { id },
      data,
    });
  }

  async deleteProduct(id: number) {
    await this.findProductById(id);

    return await this.prismaService.product.delete({
      where: { id },
    });
  }

  async findProductsByStoreId(storeId: number, page = 1) {
    const store = await this.prismaService.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const limit = 10;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prismaService.product.findMany({
        where: { store_id: storeId },
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
      }),

      this.prismaService.product.count({ where: { store_id: storeId } }),
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }
}
