import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PortfolioItem } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';

import { CreatePortfolioItemDto } from './DTO/create-portfolio-dto';
import { UpdatePortfolioItemDto } from './DTO/update-portfolio-item.dto';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // AUXILIAR — OBTER PERFIL PROFISSIONAL DO UTILIZADOR
  // =========================================================

  private async getProfessionalProfileId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        professional: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    if (!user.professional) {
      throw new ForbiddenException(
        'Apenas utilizadores com perfil profissional podem gerir o portfólio',
      );
    }

    return user.professional.id;
  }

  // =========================================================
  // CRIAR ITEM NO PORTFÓLIO
  // =========================================================

  async create(
    userId: string,
    dto: CreatePortfolioItemDto,
  ): Promise<PortfolioItem> {
    const professionalProfileId = await this.getProfessionalProfileId(userId);

    return this.prisma.portfolioItem.create({
      data: {
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        professionalProfileId,
      },
    });
  }

  // =========================================================
  // LISTAR PORTFÓLIO DO PRÓPRIO PROFISSIONAL
  // =========================================================

  async findMyPortfolio(userId: string): Promise<PortfolioItem[]> {
    const professionalProfileId = await this.getProfessionalProfileId(userId);

    return this.prisma.portfolioItem.findMany({
      where: {
        professionalProfileId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================================================
  // LISTAR PORTFÓLIO POR PERFIL PROFISSIONAL
  // ACESSO PÚBLICO
  // =========================================================

  async findByProfessionalId(
    professionalProfileId: string,
  ): Promise<PortfolioItem[]> {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: {
        id: professionalProfileId,
      },
      select: {
        id: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    return this.prisma.portfolioItem.findMany({
      where: {
        professionalProfileId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================================================
  // OBTER UM ITEM
  // =========================================================

  async findOne(id: string): Promise<PortfolioItem> {
    const item = await this.prisma.portfolioItem.findUnique({
      where: {
        id,
      },
    });

    if (!item) {
      throw new NotFoundException('Item do portfólio não encontrado');
    }

    return item;
  }

  // =========================================================
  // ATUALIZAR ITEM
  // =========================================================

  async update(
    id: string,
    userId: string,
    dto: UpdatePortfolioItemDto,
  ): Promise<PortfolioItem> {
    const professionalProfileId = await this.getProfessionalProfileId(userId);

    const item = await this.prisma.portfolioItem.findUnique({
      where: {
        id,
      },
    });

    if (!item) {
      throw new NotFoundException('Item do portfólio não encontrado');
    }

    if (item.professionalProfileId !== professionalProfileId) {
      throw new ForbiddenException('Não tens permissão para alterar este item');
    }

    return this.prisma.portfolioItem.update({
      where: {
        id,
      },
      data: {
        ...(dto.title !== undefined && {
          title: dto.title,
        }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.imageUrl !== undefined && {
          imageUrl: dto.imageUrl,
        }),
      },
    });
  }

  // =========================================================
  // REMOVER ITEM
  // =========================================================

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const professionalProfileId = await this.getProfessionalProfileId(userId);

    const item = await this.prisma.portfolioItem.findUnique({
      where: {
        id,
      },
    });

    if (!item) {
      throw new NotFoundException('Item do portfólio não encontrado');
    }

    if (item.professionalProfileId !== professionalProfileId) {
      throw new ForbiddenException(
        'Não tens permissão para eliminar este item',
      );
    }

    await this.prisma.portfolioItem.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Item removido do portfólio com sucesso',
    };
  }
}
