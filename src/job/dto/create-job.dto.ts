import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(150)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  description!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal_code!: string;
}
