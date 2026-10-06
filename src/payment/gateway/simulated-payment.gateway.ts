import { Injectable } from '@nestjs/common';
import { randomInt, randomUUID } from 'crypto';

import { ChargeRequest, ChargeResult, PaymentGateway } from './payment-gateway';

/**
 * Gateway de testes: não movimenta dinheiro real.
 *
 * - CARD / MBWAY: aprovados de imediato.
 * - MULTIBANCO: gera uma referência e fica PENDING até ser confirmado
 *   em POST /payments/:id/simulate-confirmation (simula o webhook).
 */
@Injectable()
export class SimulatedPaymentGateway extends PaymentGateway {
  readonly name = 'simulated';

  charge(request: ChargeRequest): Promise<ChargeResult> {
    const providerRef = `sim_${randomUUID()}`;

    if (request.method === 'MULTIBANCO') {
      return Promise.resolve({
        status: 'PENDING',
        providerRef,
        mbEntity: '21800',
        mbReference: String(randomInt(100_000_000, 999_999_999)),
      });
    }

    return Promise.resolve({
      status: 'SUCCEEDED',
      providerRef,
    });
  }
}
