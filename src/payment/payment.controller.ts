import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from 'src/users/auth.guard';
import { CurrentUser } from 'src/users/decorator/current-user.decorator';
import { PayJobDto } from './dto/pay-job.dto';
import { PaymentsService } from './payment.service';

@UseGuards(AuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ========================================
  // DADOS DO ECRÃ DE PAGAMENTO
  // GET /payments/job/:jobId/checkout
  // ========================================
  @Get('job/:jobId/checkout')
  async getCheckout(
    @Param('jobId') jobId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.paymentsService.getCheckout(jobId, user.sub);
  }

  // ========================================
  // PAGAR TRABALHO
  // POST /payments/job/:jobId
  // ========================================
  @Post('job/:jobId')
  async pay(
    @Param('jobId') jobId: string,
    @CurrentUser() user: { sub: string },
    @Body() body: PayJobDto,
  ) {
    return this.paymentsService.pay(jobId, user.sub, body);
  }

  // ========================================
  // SIMULAR CONFIRMAÇÃO MULTIBANCO (testes)
  // POST /payments/:id/simulate-confirmation
  // ========================================
  @Post(':id/simulate-confirmation')
  async simulateConfirmation(
    @Param('id') paymentId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.paymentsService.simulateConfirmation(paymentId, user.sub);
  }
}
