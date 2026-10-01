import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProposalDto } from './dto/create-proposal.dto';

@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // CRIAR PROPOSTA
  // =========================================================

  async create(professionalId: string, dto: CreateProposalDto) {
    // 1. VALIDAR SE O JOB EXISTE
    const job = await this.prisma.job.findUnique({
      where: {
        id: dto.jobId,
      },
      select: {
        id: true,
        clientId: true,
        categoryId: true,
        status: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Trabalho não encontrado');
    }

    // 2. IMPEDIR PROPOSTA NO PRÓPRIO JOB
    if (job.clientId === professionalId) {
      throw new ForbiddenException(
        'Não podes enviar uma proposta para o teu próprio trabalho',
      );
    }

    // 3. VERIFICAR SE O JOB ESTÁ ABERTO
    if (job.status !== 'OPEN') {
      throw new BadRequestException(
        'Este trabalho não está disponível para propostas',
      );
    }

    // 4. VERIFICAR UTILIZADOR E OBTER PERFIL PROFISSIONAL
    const user = await this.prisma.user.findUnique({
      where: {
        id: professionalId,
      },
      select: {
        id: true,
        professional: {
          select: {
            id: true,
            categoryId: true,
            status: true,
            isVerified: true,
            isAvailable: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    // 5. VERIFICAR SE POSSUI PERFIL PROFISSIONAL
    if (!user.professional) {
      throw new ForbiddenException('Não tens um perfil profissional associado');
    }

    const professionalProfile = user.professional;

    // 6. VERIFICAR SE O PERFIL ESTÁ APROVADO
    if (professionalProfile.status !== 'APPROVED') {
      throw new ForbiddenException(
        'O teu perfil profissional ainda não foi aprovado',
      );
    }

    // 7. VERIFICAR SE ESTÁ VERIFICADO
    if (!professionalProfile.isVerified) {
      throw new ForbiddenException(
        'O teu perfil profissional ainda não está verificado',
      );
    }

    // 8. VERIFICAR DISPONIBILIDADE
    if (!professionalProfile.isAvailable) {
      throw new BadRequestException(
        'O teu perfil profissional está atualmente indisponível',
      );
    }

    // 9. VALIDAR CATEGORIA
    if (professionalProfile.categoryId !== job.categoryId) {
      throw new BadRequestException(
        'A categoria do teu perfil profissional não corresponde à categoria deste trabalho',
      );
    }

    // 10. VALIDAR PREÇO
    const price = Number(dto.price);

    if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException(
        'O preço da proposta deve ser superior a zero',
      );
    }

    // 11. VERIFICAR PROPOSTA DUPLICADA
    const existingProposal = await this.prisma.proposal.findUnique({
      where: {
        jobId_professionalId: {
          jobId: job.id,
          professionalId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingProposal) {
      throw new ConflictException(
        'Já enviaste uma proposta para este trabalho',
      );
    }

    // 12. CRIAR PROPOSTA
    try {
      return await this.prisma.proposal.create({
        data: {
          jobId: job.id,
          professionalId,
          price: dto.price,
          coverLetter: dto.coverLetter,
        },
        include: {
          job: true,
          professional: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Já enviaste uma proposta para este trabalho',
        );
      }

      throw error;
    }
  }

  // =========================================================
  // LISTAR PROPOSTAS DE UM JOB
  // =========================================================

  async findByJob(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: {
        id: jobId,
      },
      select: {
        id: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Trabalho não encontrado');
    }

    return this.prisma.proposal.findMany({
      where: {
        jobId,
      },
      include: {
        professional: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            professional: {
              select: {
                bio: true,
                experienceYears: true,
                isAvailable: true,
                status: true,
                isVerified: true,
                categoryId: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================================================
  // PROPOSTAS DO PROFISSIONAL
  // =========================================================

  async findMyProposals(professionalId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: professionalId,
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
        'Apenas profissionais podem consultar as suas propostas',
      );
    }

    return this.prisma.proposal.findMany({
      where: {
        professionalId,
      },
      include: {
        job: {
          include: {
            category: true,
            images: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // =========================================================
  // OBTER PROPOSTA
  // =========================================================

  async findOne(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: {
        id: proposalId,
      },
      include: {
        job: true,
        professional: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            professional: {
              select: {
                bio: true,
                experienceYears: true,
                categoryId: true,
                status: true,
                isVerified: true,
                isAvailable: true,
              },
            },
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposta não encontrada');
    }

    return proposal;
  }

  // =========================================================
  // ACEITAR PROPOSTA
  // =========================================================

  async accept(proposalId: string, clientId: string) {
    return this.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findUnique({
        where: {
          id: proposalId,
        },
        include: {
          job: true,
          professional: {
            select: {
              id: true,
              professional: {
                select: {
                  id: true,
                  status: true,
                  isVerified: true,
                  isAvailable: true,
                  categoryId: true,
                },
              },
            },
          },
        },
      });

      if (!proposal) {
        throw new NotFoundException('Proposta não encontrada');
      }

      if (proposal.job.clientId !== clientId) {
        throw new ForbiddenException(
          'Não tens permissão para aceitar esta proposta',
        );
      }

      if (proposal.status !== 'PENDING') {
        throw new BadRequestException('Esta proposta já foi processada');
      }

      if (proposal.job.status !== 'OPEN') {
        throw new BadRequestException('Este trabalho já não está disponível');
      }

      // Validar existência e estado do perfil profissional
      if (!proposal.professional.professional) {
        throw new BadRequestException(
          'O profissional desta proposta já não possui um perfil profissional',
        );
      }

      const professionalProfile = proposal.professional.professional;

      if (professionalProfile.status !== 'APPROVED') {
        throw new BadRequestException(
          'O perfil profissional já não está aprovado',
        );
      }

      if (!professionalProfile.isVerified) {
        throw new BadRequestException(
          'O perfil profissional já não está verificado',
        );
      }

      const acceptedProposal = await tx.proposal.update({
        where: {
          id: proposalId,
        },
        data: {
          status: 'ACCEPTED',
        },
        include: {
          job: true,
          professional: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      await tx.proposal.updateMany({
        where: {
          jobId: proposal.jobId,
          id: {
            not: proposalId,
          },
          status: 'PENDING',
        },
        data: {
          status: 'REJECTED',
        },
      });

      const updatedJob = await tx.job.updateMany({
        where: {
          id: proposal.jobId,
          status: 'OPEN',
        },
        data: {
          status: 'IN_PROGRESS',
        },
      });

      if (updatedJob.count !== 1) {
        throw new ConflictException('Este trabalho já não está disponível');
      }

      return acceptedProposal;
    });
  }

  // =========================================================
  // REJEITAR PROPOSTA
  // =========================================================

  async reject(proposalId: string, clientId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: {
        id: proposalId,
      },
      include: {
        job: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposta não encontrada');
    }

    if (proposal.job.clientId !== clientId) {
      throw new ForbiddenException(
        'Não tens permissão para recusar esta proposta',
      );
    }

    if (proposal.job.status !== 'OPEN') {
      throw new BadRequestException(
        'Este trabalho já não está disponível para gerir propostas',
      );
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('Esta proposta já foi processada');
    }

    return this.prisma.proposal.update({
      where: {
        id: proposalId,
      },
      data: {
        status: 'REJECTED',
      },
      include: {
        job: true,
        professional: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });
  }
}
