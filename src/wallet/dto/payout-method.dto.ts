import { PayoutMethod } from '@prisma/client';
import { IsEnum, IsString, Matches, ValidateIf } from 'class-validator';

// Método de recebimento guardado no perfil profissional
export class PayoutMethodDto {
  @IsEnum(PayoutMethod)
  method!: PayoutMethod;

  // Número português de telemóvel (9 dígitos), obrigatório para MB WAY
  @ValidateIf((dto: PayoutMethodDto) => dto.method === PayoutMethod.MBWAY)
  @IsString()
  @Matches(/^9\d{8}$/, { message: 'Número de telemóvel MB WAY inválido' })
  phone?: string;

  // Só os últimos 4 dígitos: o número completo do cartão nunca chega à API
  // (com um provider real, o cartão é tokenizado pelo SDK dele).
  @ValidateIf((dto: PayoutMethodDto) => dto.method === PayoutMethod.CARD)
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Cartão inválido' })
  cardLast4?: string;
}
