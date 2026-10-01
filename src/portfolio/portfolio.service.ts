import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PortfolioImage, PortfolioItem } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';

import { CreatePortfolioItemDto } from './DTO/create-portfolio-dto';

import { UpdatePortfolioItemDto } from './DTO/update-portfolio-item.dto';
import cloudinary from 'src/config/cloudinary ';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  private getCloudinaryPublicId(imageUrl: string): string | undefined {
    let url: URL;

    try {
      url = new URL(imageUrl);
    } catch {
      return undefined;
    }

    if (url.hostname !== 'res.cloudinary.com') {
      return undefined;
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    const uploadIndex = pathParts.indexOf('upload');

    if (uploadIndex === -1) {
      return undefined;
    }

    const publicIdParts = pathParts.slice(uploadIndex + 1);

    if (/^v\d+$/.test(publicIdParts[0] ?? '')) {
      publicIdParts.shift();
    }

    if (publicIdParts.length === 0) {
      return undefined;
    }

    try {
      const decodedParts = publicIdParts.map(decodeURIComponent);
      const lastPartIndex = decodedParts.length - 1;
      decodedParts[lastPartIndex] = decodedParts[lastPartIndex].replace(
        /\.[^/.]+$/,
        '',
      );
      return decodedParts.join('/') || undefined;
    } catch {
      return undefined;
    }
  }

  private async deleteCloudinaryImage(imageUrl: string): Promise<void> {
    const publicId = this.getCloudinaryPublicId(imageUrl);

    if (publicId) {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
    }
  }

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
  // CRIAR ITEM DO PORTFÓLIO
  // POST /portfolio
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
        professionalProfileId,
      },
      include: {
        images: true,
      },
    });
  }

  // =========================================================
  // ADICIONAR IMAGEM AO ITEM
  // POST /portfolio/:portfolioItemId/images
  // =========================================================

  async addImage(
    portfolioItemId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<PortfolioImage> {
    const professionalProfileId = await this.getProfessionalProfileId(userId);

    const portfolioItem = await this.prisma.portfolioItem.findUnique({
      where: {
        id: portfolioItemId,
      },
      select: {
        id: true,
        professionalProfileId: true,
      },
    });

    if (!portfolioItem) {
      throw new NotFoundException('Item do portfólio não encontrado');
    }

    if (portfolioItem.professionalProfileId !== professionalProfileId) {
      throw new ForbiddenException(
        'Não tens permissão para adicionar imagens a este item',
      );
    }

    const uploadedImage = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'portfolio',
            resource_type: 'image',
          },
          (error, result) => {
            if (error) {
              reject(new Error(error.message));
            } else if (!result) {
              reject(
                new Error('Cloudinary não retornou o resultado do upload'),
              );
            } else {
              resolve({ secure_url: result.secure_url });
            }
          },
        );

        uploadStream.end(file.buffer);
      },
    );

    return this.prisma.portfolioImage.create({
      data: {
        url: uploadedImage.secure_url,
        portfolioItemId,
      },
    });
  }

  // =========================================================
  // LISTAR O MEU PORTFÓLIO
  // GET /portfolio/my
  // =========================================================

  async findMyPortfolio(userId: string): Promise<PortfolioItem[]> {
    const professionalProfileId = await this.getProfessionalProfileId(userId);

    return this.prisma.portfolioItem.findMany({
      where: {
        professionalProfileId,
      },
      include: {
        images: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================================================
  // LISTAR PORTFÓLIO DE UM PROFISSIONAL
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
      include: {
        images: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================================================
  // OBTER UM ITEM
  // GET /portfolio/:id
  // =========================================================

  async findOne(id: string): Promise<PortfolioItem> {
    const item = await this.prisma.portfolioItem.findUnique({
      where: {
        id,
      },
      include: {
        images: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item do portfólio não encontrado');
    }

    return item;
  }

  // =========================================================
  // ATUALIZAR ITEM
  // PATCH /portfolio/:id
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
      },
      include: {
        images: true,
      },
    });
  }

  // =========================================================
  // REMOVER UMA IMAGEM
  // DELETE /portfolio/images/:imageId
  // =========================================================

  async removeImage(
    imageId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const professionalProfileId = await this.getProfessionalProfileId(userId);

    const image = await this.prisma.portfolioImage.findUnique({
      where: {
        id: imageId,
      },
      select: {
        id: true,
        url: true,
        portfolioItem: {
          select: {
            professionalProfileId: true,
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Imagem do portfólio não encontrada');
    }

    if (image.portfolioItem.professionalProfileId !== professionalProfileId) {
      throw new ForbiddenException(
        'Não tens permissão para eliminar esta imagem',
      );
    }

    await this.deleteCloudinaryImage(image.url);

    await this.prisma.portfolioImage.delete({
      where: {
        id: imageId,
      },
    });

    return {
      message: 'Imagem removida do portfólio com sucesso',
    };
  }

  // =========================================================
  // REMOVER ITEM COMPLETO
  // DELETE /portfolio/:id
  // =========================================================

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const professionalProfileId = await this.getProfessionalProfileId(userId);

    const item = await this.prisma.portfolioItem.findUnique({
      where: {
        id,
      },
      include: {
        images: {
          select: {
            url: true,
          },
        },
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

    await Promise.all(
      item.images.map((image) => this.deleteCloudinaryImage(image.url)),
    );

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
