import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  imageUrl!: string;
}
