import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateJobDto } from './dto/create-job.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import cloudinary from 'src/config/cloudinary ';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------
  // Criar Job
  // --------------------------------
  async create(clientId: string, dto: CreateJobDto) {
    // --------------------------------
    // 1. Validar categoria
    // --------------------------------
    const category = await this.prisma.category.findUnique({
      where: {
        id: dto.categoryId,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    // --------------------------------
    // 2. Criar Job
    // --------------------------------
    // A localização é inserida manualmente
    // pelo utilizador.
    const job = await this.prisma.job.create({
      data: {
        title: dto.title,
        description: dto.description,

        clientId,
        categoryId: dto.categoryId,

        // --------------------------------
        // Morada inserida manualmente
        // --------------------------------
        address: dto.address,
        postal_code: dto.postal_code,
        city: dto.city,
      },

      include: {
        category: true,

        client: {
          select: {
            id: true,
            first_name: true,
            email: true,
          },
        },

        images: true,
      },
    });

    return job;
  }

  // --------------------------------
  // Listar todos os Jobs
  // --------------------------------
  async findAll() {
    return this.prisma.job.findMany({
      where: {
        status: 'OPEN',
      },

      orderBy: {
        createdAt: 'desc',
      },

      include: {
        category: true,

        client: {
          select: {
            id: true,
            first_name: true,
            email: true,
          },
        },

        images: true,
        proposals: {
          select: {
            professional: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
            price: true,
          },
        },
      },
    });
  }

  // --------------------------------
  // Obter Job por ID
  // --------------------------------
  async getJobById(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: {
        id: jobId,
      },

      include: {
        category: true,

        client: {
          select: {
            id: true,
            first_name: true,
            email: true,
          },
        },

        images: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job não encontrado');
    }

    return job;
  }

  // --------------------------------
  // Jobs do utilizador autenticado
  // --------------------------------
  async getMyJobs(clientId: string) {
    return this.prisma.job.findMany({
      where: {
        clientId,
      },

      include: {
        category: true,

        client: {
          select: {
            id: true,
            first_name: true,
            email: true,
          },
        },

        images: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // --------------------------------
  // Upload de imagem
  // --------------------------------
  async uploadImage(jobId: string, userId: string, file: Express.Multer.File) {
    // --------------------------------
    // 1. Buscar o Job
    // --------------------------------
    const job = await this.prisma.job.findUnique({
      where: {
        id: jobId,
      },

      include: {
        _count: {
          select: {
            images: true,
          },
        },
      },
    });

    // --------------------------------
    // 2. Verificar se o Job existe
    // --------------------------------
    if (!job) {
      throw new NotFoundException('Trabalho não encontrado');
    }

    // --------------------------------
    // 3. Verificar proprietário
    // --------------------------------
    if (job.clientId !== userId) {
      throw new ForbiddenException(
        'Não tens permissão para adicionar imagens a este trabalho',
      );
    }

    // --------------------------------
    // 4. Limite de imagens
    // --------------------------------
    if (job._count.images >= 5) {
      throw new BadRequestException('Um trabalho pode ter no máximo 5 imagens');
    }

    // --------------------------------
    // 5. Upload para Cloudinary
    // --------------------------------
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'jobs',
          resource_type: 'image',
        },

        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      );

      uploadStream.end(file.buffer);
    });

    // --------------------------------
    // 6. Guardar imagem na BD
    // --------------------------------
    const jobImage = await this.prisma.jobImage.create({
      data: {
        url: result.secure_url,
        jobId: job.id,
      },
    });

    return jobImage;
  }
}
