import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';

import { AuthGuard } from 'src/users/auth.guard';
import { CurrentUser } from 'src/users/decorator/current-user.decorator';
import { PayoutMethodDto } from './dto/payout-method.dto';
import { WalletService } from './wallet.service';

@UseGuards(AuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // ========================================
  // SALDO, VALOR RETIDO E MOVIMENTOS
  // GET /wallet/me
  // ========================================
  @Get('me')
  async getMyWallet(@CurrentUser() user: { sub: string }) {
    return this.walletService.getMyWallet(user.sub);
  }

  // ========================================
  // GUARDAR MÉTODO DE RECEBIMENTO
  // PUT /wallet/payout-method
  // ========================================
  @Put('payout-method')
  async setPayoutMethod(
    @CurrentUser() user: { sub: string },
    @Body() body: PayoutMethodDto,
  ) {
    return this.walletService.setPayoutMethod(user.sub, body);
  }

  // ========================================
  // LEVANTAR SALDO PARA O MÉTODO DE RECEBIMENTO
  // POST /wallet/withdraw
  // ========================================
  @Post('withdraw')
  async withdraw(@CurrentUser() user: { sub: string }) {
    return this.walletService.requestWithdrawal(user.sub);
  }
}
