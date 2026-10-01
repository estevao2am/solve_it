import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProposalDto } from './dto/create-proposal.dto';

@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------
  // Criar Proposal
  // --------------------------------

  async create(professionalId: string, dto: CreateProposalDto) {
    // --------------------------------
    // 1. Verificar se o Job existe
    // --------------------------------

    const job = await this.prisma.job.findUnique({
      where: {
        id: dto.jobId,
      },
    });

    if (!job) {
      throw new NotFoundException('Trabalho não encontrado');
    }

    // --------------------------------
    // 2. Verificar se o Job está aberto
    // --------------------------------

    if (job.status !== 'OPEN') {
      throw new BadRequestException(
        'Este trabalho não está disponível para propostas',
      );
    }

    // --------------------------------
    // 3. Impedir candidatura ao próprio Job
    // --------------------------------

    if (job.clientId === professionalId) {
      throw new ForbiddenException(
        'Não podes enviar uma proposta para o teu próprio trabalho',
      );
    }

    // --------------------------------
    // 4. Verificar proposta duplicada
    // --------------------------------

    const existingProposal = await this.prisma.proposal.findFirst({
      where: {
        jobId: dto.jobId,
        professionalId,
      },
    });

    if (existingProposal) {
      throw new BadRequestException(
        'Já enviaste uma proposta para este trabalho',
      );
    }

    // --------------------------------
    // 5. Criar Proposal
    // --------------------------------

    const proposal = await this.prisma.proposal.create({
      data: {
        price: dto.price,
        coverLetter: dto.coverLetter,
        jobId: dto.jobId,
        professionalId,
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

    return proposal;
  }

  // --------------------------------
  // Listar propostas de um Job
  // --------------------------------

  async findByJob(jobId: string) {
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // --------------------------------
  // Propostas do profissional
  // --------------------------------

  async findMyProposals(professionalId: string) {
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

  // --------------------------------
  // Obter Proposal por ID
  // --------------------------------

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
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Proposta não encontrada');
    }

    return proposal;
  }

  // --------------------------------
  // Aceitar Proposal
  // --------------------------------

  async accept(proposalId: string, clientId: string) {
    // --------------------------------
    // 1. Procurar a Proposal
    // --------------------------------

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

    // --------------------------------
    // 2. Verificar se o utilizador é
    //    o dono do Job
    // --------------------------------

    if (proposal.job.clientId !== clientId) {
      throw new ForbiddenException(
        'Não tens permissão para aceitar esta proposta',
      );
    }

    // --------------------------------
    // 3. Verificar se o Job está aberto
    // --------------------------------

    if (proposal.job.status !== 'OPEN') {
      throw new BadRequestException('Este trabalho já não está disponível');
    }

    // --------------------------------
    // 4. Verificar se a Proposal está pendente
    // --------------------------------

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('Esta proposta já foi processada');
    }

    // --------------------------------
    // 5. Aceitar Proposal,
    //    rejeitar restantes e colocar
    //    Job em IN_PROGRESS
    // --------------------------------

    return this.prisma.$transaction(async (tx) => {
      // Aceitar a proposta escolhida
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

      // Rejeitar todas as outras propostas
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

      // Alterar o estado do Job
      await tx.job.update({
        where: {
          id: proposal.jobId,
        },
        data: {
          status: 'IN_PROGRESS',
        },
      });

      return acceptedProposal;
    });
  }

  // --------------------------------
  // Recusar Proposal
  // --------------------------------

  async reject(proposalId: string, clientId: string) {
    // --------------------------------
    // 1. Procurar a Proposal
    // --------------------------------

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

    // --------------------------------
    // 2. Verificar se o utilizador é
    //    o dono do Job
    // --------------------------------

    if (proposal.job.clientId !== clientId) {
      throw new ForbiddenException(
        'Não tens permissão para recusar esta proposta',
      );
    }

    // --------------------------------
    // 3. Verificar se o Job está aberto
    // --------------------------------

    if (proposal.job.status !== 'OPEN') {
      throw new BadRequestException('Este trabalho já não está disponível');
    }

    // --------------------------------
    // 4. Verificar se a Proposal está pendente
    // --------------------------------

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('Esta proposta já foi processada');
    }

    // --------------------------------
    // 5. Recusar Proposal
    // --------------------------------

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
