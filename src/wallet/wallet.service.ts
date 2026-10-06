import { BadRequestException, Injectable } from '@nestjs/common';
import { PayoutMethod, Prisma } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';
import { PayoutMethodDto } from './dto/payout-method.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // CREDITAR CARTEIRA (usado ao libertar um pagamento)
  // Tem de correr dentro da transação de quem liberta o pagamento.
  // =========================================================

  async credit(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      amount: Prisma.Decimal;
      description: string;
      paymentId: string;
    },
  ) {
    const wallet = await tx.wallet.upsert({
      where: {
        userId: params.userId,
      },
      create: {
        userId: params.userId,
        balance: params.amount,
      },
      update: {
        balance: {
          increment: params.amount,
        },
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        status: 'COMPLETED',
        amount: params.amount,
        description: params.description,
        paymentId: params.paymentId,
      },
    });

    return wallet;
  }

  // =========================================================
  // A MINHA CARTEIRA
  // =========================================================

  async getMyWallet(userId: string) {
    const [wallet, held, profile] = await Promise.all([
      this.prisma.wallet.findUnique({
        where: {
          userId,
        },
        include: {
          transactions: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 50,
            include: {
              payment: {
                select: {
                  job: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                  client: {
                    select: {
                      first_name: true,
                      last_name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      // Valor pago por clientes mas ainda retido (trabalhos por concluir)
      this.prisma.payment.aggregate({
        where: {
          professionalId: userId,
          status: 'HELD',
        },
        _sum: {
          professionalAmount: true,
        },
      }),

      this.prisma.professionalProfile.findUnique({
        where: {
          userId,
        },
        select: PAYOUT_PROFILE_SELECT,
      }),
    ]);

    return {
      balance: wallet?.balance ?? new Prisma.Decimal(0),
      heldAmount: held._sum.professionalAmount ?? new Prisma.Decimal(0),
      payoutAccount: profile ? toPayoutAccount(profile) : null,
      transactions: wallet?.transactions ?? [],
    };
  }

  // =========================================================
  // GUARDAR MÉTODO DE RECEBIMENTO (MB WAY, cartão ou IBAN)
  // =========================================================

  async setPayoutMethod(userId: string, dto: PayoutMethodDto) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!profile) {
      throw new BadRequestException(
        'É necessário um perfil profissional para definir o método de recebimento',
      );
    }

    const updated = await this.prisma.professionalProfile.update({
      where: {
        id: profile.id,
      },
      data: {
        payoutMethod: dto.method,
        payoutPhone: dto.method === 'MBWAY' ? dto.phone : null,
        payoutCardLast4: dto.method === 'CARD' ? dto.cardLast4 : null,
      },
      select: PAYOUT_PROFILE_SELECT,
    });

    return toPayoutAccount(updated);
  }

  // =========================================================
  // LEVANTAMENTO DO SALDO TOTAL PARA O MÉTODO DE RECEBIMENTO
  // Simulação (não movimenta dinheiro real):
  // - MB WAY e cartão ficam concluídos de imediato;
  // - transferência bancária (IBAN do perfil) fica PENDING até ser
  //   processada fora da app.
  // =========================================================

  async requestWithdrawal(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: {
        userId,
      },
      select: PAYOUT_PROFILE_SELECT,
    });

    if (!profile) {
      throw new BadRequestException(
        'É necessário um perfil profissional para levantar o saldo',
      );
    }

    const { method, destination } = toPayoutAccount(profile);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          userId,
        },
      });

      if (!wallet || wallet.balance.lte(0)) {
        throw new BadRequestException('Não tens saldo disponível');
      }

      const amount = wallet.balance;

      // Condicional para evitar levantamentos duplicados em paralelo
      const updated = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          balance: {
            gte: amount,
          },
        },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      if (updated.count !== 1) {
        throw new BadRequestException('Saldo insuficiente');
      }

      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          status: method === 'BANK_TRANSFER' ? 'PENDING' : 'COMPLETED',
          amount,
          description: `Levantamento para ${destination}`,
          payoutMethod: method,
          payoutDestination: destination,
        },
      });
    });
  }
}

const PAYOUT_PROFILE_SELECT = {
  accountHolder: true,
  iban: true,
  payoutMethod: true,
  payoutPhone: true,
  payoutCardLast4: true,
} satisfies Prisma.ProfessionalProfileSelect;

type PayoutProfile = Prisma.ProfessionalProfileGetPayload<{
  select: typeof PAYOUT_PROFILE_SELECT;
}>;

// Método de recebimento para a app: só dados mascarados
function toPayoutAccount(profile: PayoutProfile) {
  const ibanMasked = maskIban(profile.iban);

  // Sem número/cartão guardado, volta à transferência para o IBAN
  const method: PayoutMethod =
    (profile.payoutMethod === 'MBWAY' && profile.payoutPhone) ||
    (profile.payoutMethod === 'CARD' && profile.payoutCardLast4)
      ? profile.payoutMethod
      : 'BANK_TRANSFER';

  const destination =
    method === 'MBWAY'
      ? `MB WAY •••• ${profile.payoutPhone?.slice(-3)}`
      : method === 'CARD'
        ? `Cartão •••• ${profile.payoutCardLast4}`
        : ibanMasked;

  return {
    accountHolder: profile.accountHolder,
    ibanMasked,
    method,
    destination,
  };
}

function maskIban(iban: string) {
  const clean = iban.replace(/\s+/g, '');

  return `${clean.slice(0, 4)} •••• ${clean.slice(-4)}`;
}
