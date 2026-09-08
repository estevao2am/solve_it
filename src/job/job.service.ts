import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import cloudinary from 'src/config/cloudinary ';
import { LocationService } from 'src/location/location.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
  ) {}

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
    // 2. Validar e obter localização
    // --------------------------------
    const location = await this.locationService.resolveLocationAndGeocode(
      dto.address,
      dto.city,
      dto.postal_code,
    );

    // --------------------------------
    // 3. Criar Job
    // --------------------------------
    const job = await this.prisma.job.create({
      data: {
        title: dto.title,
        description: dto.description,

        clientId,
        categoryId: dto.categoryId,

        // --------------------------------
        // Morada
        // --------------------------------
        address: dto.address,
        city: location.resolvedCity,
        postal_code: dto.postal_code,

        // --------------------------------
        // Coordenadas obtidas através do
        // Nominatim / OpenStreetMap
        // --------------------------------
        latitude: location.latitude,
        longitude: location.longitude,

        locationVerified: true,
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
      },
    });
  }

  async uploadImage(jobId: string, userId: string, file: Express.Multer.File) {
    // Buscar o Job
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

    // Job não existe
    if (!job) {
      throw new NotFoundException('Trabalho não encontrado');
    }

    // Verificar se o utilizador autenticado é o dono
    if (job.clientId !== userId) {
      throw new ForbiddenException(
        'Não tens permissão para adicionar imagens a este trabalho',
      );
    }

    // Limite de 5 imagens
    if (job._count.images >= 5) {
      throw new BadRequestException('Um trabalho pode ter no máximo 5 imagens');
    }

    // Upload para Cloudinary
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

    // Guardar imagem associada ao Job
    const jobImage = await this.prisma.jobImage.create({
      data: {
        url: result.secure_url,
        jobId: job.id,
      },
    });

    return jobImage;
  }
}
