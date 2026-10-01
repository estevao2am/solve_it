// dto/create-portfolio-item.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreatePortfolioItemDto {
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório' })
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'A URL da imagem é obrigatória' })
  @IsUrl({}, { message: 'Informa uma URL válida para a imagem' })
  imageUrl!: string;
}
