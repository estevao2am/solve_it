// dto/update-portfolio-item.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePortfolioItemDto } from './create-portfolio-dto';

export class UpdatePortfolioItemDto extends PartialType(
  CreatePortfolioItemDto,
) {}
