import { IsEnum } from 'class-validator';
import { ProfessionalStatus } from '@prisma/client';

export class UpdateProfessionalStatusDto {
  @IsEnum(ProfessionalStatus)
  status!: ProfessionalStatus;
}
