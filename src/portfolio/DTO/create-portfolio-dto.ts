// dto/create-portfolio-item.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePortfolioItemDto {
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório' })
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
