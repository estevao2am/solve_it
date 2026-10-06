import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { JobStatus, Prisma } from '@prisma/client';

import { CreateJobDto } from './dto/create-job.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import cloudinary from 'src/config/cloudinary ';
import { NotificationsService } from 'src/notification/notification.service';
import { PaymentsService } from 'src/payment/payment.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
  // TODO: Listar todos os Jobs com o status aberto, para os profissionais,

  // --------------------------------
  // Listar todos os Jobs
  // --------------------------------

  async findAll() {
    return this.prisma.job.findMany({
      // where: {
      //   status: 'OPEN',
      // },

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

  // --------------------------------
  // Trabalhos atribuídos ao profissional (proposta aceite)
  // --------------------------------
  async getAssignedJobs(professionalId: string) {
    return this.prisma.job.findMany({
      where: {
        proposals: {
          some: {
            professionalId,
            status: 'ACCEPTED',
          },
        },
      },

      include: {
        category: true,

        client: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
          },
        },

        images: true,

        proposals: {
          where: {
            professionalId,
            status: 'ACCEPTED',
          },
          select: {
            id: true,
            price: true,
          },
        },

        payment: {
          select: {
            status: true,
            method: true,
            professionalAmount: true,
            paidAt: true,
            releasedAt: true,
          },
        },
      },

      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // --------------------------------
  // Profissional inicia o trabalho (PAID → IN_PROGRESS)
  // --------------------------------
  async start(jobId: string, professionalId: string) {
    return this.prisma.$transaction(async (tx) => {
      const job = await this.findAssignedJob(tx, jobId, professionalId);

      await this.transition(
        tx,
        job.id,
        'PAID',
        'IN_PROGRESS',
        'O trabalho só pode ser iniciado depois de pago',
      );

      await this.notificationsService.create(
        {
          userId: job.clientId,
          type: 'JOB_STATUS_UPDATED',
          title: 'Trabalho iniciado',
          message: `O profissional iniciou o trabalho "${job.title}".`,
        },
        tx,
      );

      return { id: job.id, status: 'IN_PROGRESS' as const };
    });
  }

  // --------------------------------
  // Profissional marca como concluído (IN_PROGRESS → AWAITING_CONFIRMATION)
  // --------------------------------
  async markDone(jobId: string, professionalId: string) {
    return this.prisma.$transaction(async (tx) => {
      const job = await this.findAssignedJob(tx, jobId, professionalId);

      await this.transition(
        tx,
        job.id,
        'IN_PROGRESS',
        'AWAITING_CONFIRMATION',
        'O trabalho tem de estar em curso para ser marcado como concluído',
      );

      await this.notificationsService.create(
        {
          userId: job.clientId,
          type: 'JOB_STATUS_UPDATED',
          title: 'Confirma a conclusão do trabalho',
          message: `O profissional marcou "${job.title}" como concluído. Confirma para libertar o pagamento.`,
        },
        tx,
      );

      return { id: job.id, status: 'AWAITING_CONFIRMATION' as const };
    });
  }

  // --------------------------------
  // Cliente confirma a conclusão (AWAITING_CONFIRMATION → COMPLETED)
  // e o valor retido é creditado na carteira do profissional.
  // --------------------------------
  async confirmCompletion(jobId: string, clientId: string) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: {
          id: jobId,
        },
        select: {
          id: true,
          clientId: true,
        },
      });

      if (!job) {
        throw new NotFoundException('Trabalho não encontrado');
      }

      if (job.clientId !== clientId) {
        throw new ForbiddenException(
          'Não tens permissão para concluir este trabalho',
        );
      }

      await this.transition(
        tx,
        job.id,
        'AWAITING_CONFIRMATION',
        'COMPLETED',
        'O profissional ainda não marcou o trabalho como concluído',
      );

      const payment = await this.paymentsService.release(tx, job.id);

      // amount = valor pago pelo cliente e libertado ao profissional
      return {
        id: job.id,
        status: 'COMPLETED' as const,
        amount: payment.amount,
      };
    });
  }

  // --------------------------------
  // Helpers do fluxo
  // --------------------------------
  private async findAssignedJob(
    tx: Prisma.TransactionClient,
    jobId: string,
    professionalId: string,
  ) {
    const job = await tx.job.findUnique({
      where: {
        id: jobId,
      },
      select: {
        id: true,
        title: true,
        clientId: true,
        proposals: {
          where: {
            status: 'ACCEPTED',
          },
          select: {
            professionalId: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Trabalho não encontrado');
    }

    if (job.proposals[0]?.professionalId !== professionalId) {
      throw new ForbiddenException('Este trabalho não te está atribuído');
    }

    return job;
  }

  // Atualização condicional: falha se o estado mudou entretanto.
  private async transition(
    tx: Prisma.TransactionClient,
    jobId: string,
    from: JobStatus,
    to: JobStatus,
    errorMessage: string,
  ) {
    const updated = await tx.job.updateMany({
      where: {
        id: jobId,
        status: from,
      },
      data: {
        status: to,
      },
    });

    if (updated.count !== 1) {
      throw new BadRequestException(errorMessage);
    }
  }
}

// TODO:
