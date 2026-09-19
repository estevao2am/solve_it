import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  IsEnum,
} from 'class-validator';

import { ProfessionalType } from '@prisma/client';

export class CreateProfessionalDto {
  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsEnum(ProfessionalType)
  fiscalType!: ProfessionalType;

  @IsString()
  @IsNotEmpty()
  nif!: string;

  @IsOptional()
  @IsString()
  niss?: string;

  @IsString()
  @IsNotEmpty()
  accountHolder!: string;

  @IsString()
  @IsNotEmpty()
  iban!: string;
}
