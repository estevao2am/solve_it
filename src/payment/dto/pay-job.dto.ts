import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsString, Matches, ValidateIf } from 'class-validator';

export class PayJobDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  // Número português de telemóvel (9 dígitos), obrigatório para MB WAY
  @ValidateIf((dto: PayJobDto) => dto.method === PaymentMethod.MBWAY)
  @IsString()
  @Matches(/^9\d{8}$/, { message: 'Número de telemóvel MB WAY inválido' })
  phone?: string;
}
