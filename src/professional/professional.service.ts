import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessionalDto } from './create-professional';
import { UpdateProfessionalDto } from './update-professional';
import { NotificationsService } from 'src/notification/notification.service';

@Injectable()
export class ProfessionalProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateProfessionalDto) {
    const existingProfile = await this.prisma.professionalProfile.findUnique({
      where: {
        userId,
      },
    });

    if (existingProfile) {
      throw new ConflictException(
        'O utilizador já possui um perfil profissional',
      );
    }

    const category = await this.prisma.category.findUnique({
      where: {
        id: dto.categoryId,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    const nifExists = await this.prisma.professionalProfile.findFirst({
      where: {
        nif: dto.nif,
      },
    });

    if (nifExists) {
      throw new ConflictException('Já existe um profissional com este NIF');
    }

    const professional = await this.prisma.professionalProfile.create({
      data: {
        userId,
        categoryId: dto.categoryId,

        bio: dto.bio,
        experienceYears: dto.experienceYears,
        isAvailable: dto.isAvailable ?? true,

        fiscalType: dto.fiscalType,
        nif: dto.nif,
        niss: dto.niss,

        accountHolder: dto.accountHolder,
        iban: dto.iban,

        status: 'PENDING',
        isVerified: false,
      },

      include: {
        category: true,
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            avatar_url: true,
          },
        },
      },
    });

    return professional;
  }

  async findMyProfile(userId: string) {
    const professional = await this.prisma.professionalProfile.findUnique({
      where: {
        userId,
      },
      include: {
        category: true,
        documents: true,
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            city: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!professional) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    return professional;
  }

  async findById(id: string) {
    const professional = await this.prisma.professionalProfile.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
        documents: true,
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            city: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!professional) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    return professional;
  }

  async update(userId: string, dto: UpdateProfessionalDto) {
    const professional = await this.prisma.professionalProfile.findUnique({
      where: {
        userId,
      },
    });

    if (!professional) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: {
          id: dto.categoryId,
        },
      });

      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }
    }

    if (dto.nif && dto.nif !== professional.nif) {
      const nifExists = await this.prisma.professionalProfile.findFirst({
        where: {
          nif: dto.nif,
          NOT: {
            id: professional.id,
          },
        },
      });

      if (nifExists) {
        throw new ConflictException('Já existe um profissional com este NIF');
      }
    }

    return this.prisma.professionalProfile.update({
      where: {
        userId,
      },

      data: {
        categoryId: dto.categoryId,
        bio: dto.bio,
        experienceYears: dto.experienceYears,
        isAvailable: dto.isAvailable,

        fiscalType: dto.fiscalType,
        nif: dto.nif,
        niss: dto.niss,

        accountHolder: dto.accountHolder,
        iban: dto.iban,
      },

      include: {
        category: true,
      },
    });
  }

  async updateStatus(professionalId: string) {
    const professional = await this.prisma.professionalProfile.findUnique({
      where: {
        id: professionalId,
      },
    });

    if (!professional) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    // Aprovar o perfil
    const updatedProfessional = await this.prisma.professionalProfile.update({
      where: {
        id: professionalId,
      },
      data: {
        status: 'APPROVED',
        isVerified: true,
      },
    });

    // Enviar notificação ao utilizador dono do perfil
    await this.notificationsService.create({
      userId: professional.userId,
      type: 'ACCOUNT_APPROVED',
      title: 'Perfil profissional aprovado 🎉',
      message:
        'O teu perfil profissional foi aprovado. Já podes começar a utilizar todas as funcionalidades profissionais da plataforma.',
    });

    return updatedProfessional;
  }

  async findAll() {
    return this.prisma.professionalProfile.findMany({
      include: {
        category: true,

        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
            city: true,
          },
        },
        documents: {
          select: {
            id: true,

            name: true,
            uri: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findApproved() {
    return this.prisma.professionalProfile.findMany({
      where: {
        status: 'APPROVED',
        isVerified: true,
        isAvailable: true,
      },

      include: {
        category: true,

        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar_url: true,
            city: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
