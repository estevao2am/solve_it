import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProposalDto {
  @IsNumber()
  @Min(0.01)
  price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverLetter?: string;

  @IsUUID()
  @IsNotEmpty()
  jobId!: string;
}
