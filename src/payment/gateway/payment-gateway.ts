import { PaymentMethod, Prisma } from '@prisma/client';

export type ChargeRequest = {
  paymentId: string;
  amount: Prisma.Decimal;
  method: PaymentMethod;
  phone?: string;
};

export type ChargeResult =
  | { status: 'SUCCEEDED'; providerRef: string }
  | {
      status: 'PENDING';
      providerRef: string;
      mbEntity?: string;
      mbReference?: string;
    }
  | { status: 'FAILED'; reason: string };

/**
 * Contrato com o provider de pagamentos (Stripe, ifthenpay, Eupago, ...).
 *
 * Pagamentos assíncronos (ex.: Multibanco) devolvem PENDING; a confirmação
 * chega depois por webhook, que deve chamar PaymentsService.confirmPaid().
 */
export abstract class PaymentGateway {
  abstract readonly name: string;

  abstract charge(request: ChargeRequest): Promise<ChargeResult>;
}
