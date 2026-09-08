import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, dto: CreateJobDto) {
    // Verificar se a categoria existe
    const category = await this.prisma.category.findUnique({
      where: {
        id: dto.categoryId,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    // Criar Job
    const job = await this.prisma.job.create({
      data: {
        title: dto.title,
        description: dto.description,
        clientId,
        categoryId: dto.categoryId,
      },
      include: {
        category: true,
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
      },
    });
  }
}
