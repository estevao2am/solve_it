import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, Prisma } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/notification/notification.service';
import { WalletService } from 'src/wallet/wallet.service';
import { PayJobDto } from './dto/pay-job.dto';
import { PaymentGateway } from './gateway/payment-gateway';

const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'MBWAY', 'MULTIBANCO'];

@Injectable()
export class PaymentsService {
  // Comissão da plataforma (%), descontada ao valor do profissional
  private readonly feePercent: Prisma.Decimal;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentGateway,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    config: ConfigService,
  ) {
    const fee = Number(config.get<string>('PLATFORM_FEE_PERCENT') ?? 0);

    this.feePercent = new Prisma.Decimal(
      Number.isFinite(fee) ? Math.min(Math.max(fee, 0), 100) : 0,
    );
  }

  // =========================================================
  // DADOS DO ECRÃ DE PAGAMENTO
  // =========================================================

  async getCheckout(jobId: string, clientId: string) {
    const { job, proposal } = await this.findJobForClient(jobId, clientId);

    return {
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        status: job.status,
        category: job.category,
      },
      professional: proposal.professional,
      amount: proposal.price,
      methods: PAYMENT_METHODS,
      payment: job.payment,
    };
  }

  // =========================================================
  // PAGAR TRABALHO
  // =========================================================

  async pay(jobId: string, clientId: string, dto: PayJobDto) {
    const { job, proposal } = await this.findJobForClient(jobId, clientId);

    if (job.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException(
        'Este trabalho não está a aguardar pagamento',
      );
    }

    const amount = proposal.price;
    const platformFee = amount.mul(this.feePercent).div(100).toDecimalPlaces(2);

    const data = {
      amount,
      platformFee,
      professionalAmount: amount.sub(platformFee),
      method: dto.method,
      status: 'PENDING' as const,
      phone: dto.method === 'MBWAY' ? dto.phone : null,
      providerRef: null,
      mbEntity: null,
      mbReference: null,
    };

    // Um pagamento por trabalho: uma nova tentativa (ex.: mudar de
    // Multibanco para MB WAY) reutiliza o registo pendente/falhado.
    let paymentId: string;

    if (job.payment) {
      const updated = await this.prisma.payment.updateMany({
        where: {
          id: job.payment.id,
          status: {
            in: ['PENDING', 'FAILED'],
          },
        },
        data,
      });

      if (updated.count !== 1) {
        throw new ConflictException('Este trabalho já foi pago');
      }

      paymentId = job.payment.id;
    } else {
      try {
        const created = await this.prisma.payment.create({
          data: {
            ...data,
            jobId: job.id,
            clientId,
            professionalId: proposal.professionalId,
          },
        });

        paymentId = created.id;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Já existe um pagamento em curso');
        }

        throw error;
      }
    }

    const result = await this.gateway.charge({
      paymentId,
      amount,
      method: dto.method,
      phone: dto.phone,
    });

    if (result.status === 'FAILED') {
      await this.prisma.payment.update({
        where: {
          id: paymentId,
        },
        data: {
          status: 'FAILED',
        },
      });

      throw new BadRequestException(result.reason);
    }

    if (result.status === 'PENDING') {
      return this.prisma.payment.update({
        where: {
          id: paymentId,
        },
        data: {
          providerRef: result.providerRef,
          mbEntity: result.mbEntity,
          mbReference: result.mbReference,
        },
      });
    }

    return this.confirmPaid(paymentId, result.providerRef);
  }

  // =========================================================
  // CONFIRMAR PAGAMENTO (resposta do provider ou webhook)
  // O valor fica retido (HELD) e o trabalho passa a PAID.
  // Idempotente: confirmar duas vezes não tem efeito.
  // =========================================================

  async confirmPaid(paymentId: string, providerRef: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: {
          id: paymentId,
          status: {
            in: ['PENDING', 'FAILED'],
          },
        },
        data: {
          status: 'HELD',
          paidAt: new Date(),
          providerRef,
        },
      });

      const payment = await tx.payment.findUniqueOrThrow({
        where: {
          id: paymentId,
        },
        include: {
          job: {
            select: {
              title: true,
            },
          },
        },
      });

      if (updated.count === 0) {
        return payment;
      }

      const job = await tx.job.updateMany({
        where: {
          id: payment.jobId,
          status: 'AWAITING_PAYMENT',
        },
        data: {
          status: 'PAID',
        },
      });

      if (job.count !== 1) {
        throw new ConflictException(
          'Este trabalho já não está a aguardar pagamento',
        );
      }

      await this.notificationsService.create(
        {
          userId: payment.professionalId,
          type: 'PAYMENT_CONFIRMED',
          title: 'Pagamento confirmado',
          message: `O cliente pagou "${payment.job.title}". Já podes iniciar o trabalho. O valor fica retido na plataforma e é transferido para a tua carteira quando o cliente confirmar a conclusão.`,
        },
        tx,
      );

      return payment;
    });
  }

  // =========================================================
  // SIMULAR CONFIRMAÇÃO (apenas com o gateway simulado)
  // Faz o papel do webhook do provider para pagamentos Multibanco.
  // =========================================================

  async simulateConfirmation(paymentId: string, clientId: string) {
    if (this.gateway.name !== 'simulated') {
      throw new NotFoundException();
    }

    const payment = await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    if (payment.clientId !== clientId) {
      throw new ForbiddenException(
        'Não tens permissão para confirmar este pagamento',
      );
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Este pagamento não está pendente');
    }

    return this.confirmPaid(
      payment.id,
      payment.providerRef ?? `sim_${payment.id}`,
    );
  }

  // =========================================================
  // LIBERTAR VALOR RETIDO PARA A CARTEIRA DO PROFISSIONAL
  // Tem de correr dentro da transação que conclui o trabalho.
  // =========================================================

  async release(tx: Prisma.TransactionClient, jobId: string) {
    const payment = await tx.payment.findUnique({
      where: {
        jobId,
      },
      include: {
        job: {
          select: {
            title: true,
          },
        },
      },
    });

    const updated = payment
      ? await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: 'HELD',
          },
          data: {
            status: 'RELEASED',
            releasedAt: new Date(),
          },
        })
      : null;

    if (!payment || updated?.count !== 1) {
      throw new ConflictException(
        'Não existe um pagamento retido para este trabalho',
      );
    }

    await this.walletService.credit(tx, {
      userId: payment.professionalId,
      amount: payment.professionalAmount,
      description: `Pagamento recebido — ${payment.job.title}`,
      paymentId: payment.id,
    });

    // `data` permite à app abrir "Pagamentos e Faturação" com este valor
    await this.notificationsService.create(
      {
        userId: payment.professionalId,
        type: 'WALLET_CREDITED',
        title: 'Pagamento recebido',
        message: `O cliente confirmou a conclusão de "${payment.job.title}". ${payment.professionalAmount.toFixed(2).replace('.', ',')} € foram creditados na tua carteira.`,
        data: {
          paymentId: payment.id,
          jobId: payment.jobId,
          amount: payment.professionalAmount.toString(),
        },
      },
      tx,
    );

    return payment;
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private async findJobForClient(jobId: string, clientId: string) {
    const job = await this.prisma.job.findUnique({
      where: {
        id: jobId,
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
        proposals: {
          where: {
            status: 'ACCEPTED',
          },
          include: {
            professional: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_url: true,
              },
            },
          },
        },
        payment: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Trabalho não encontrado');
    }

    if (job.clientId !== clientId) {
      throw new ForbiddenException(
        'Não tens permissão para pagar este trabalho',
      );
    }

    const proposal = job.proposals[0];

    if (!proposal) {
      throw new BadRequestException(
        'Este trabalho ainda não tem uma proposta aceite',
      );
    }

    return { job, proposal };
  }
}
