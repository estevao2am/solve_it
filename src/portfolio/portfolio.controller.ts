import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { PortfolioItem } from '@prisma/client';

import { AuthGuard } from 'src/users/auth.guard';
import { CurrentUser } from 'src/users/decorator/current-user.decorator';

import { CreatePortfolioItemDto } from './DTO/create-portfolio-dto';
import { UpdatePortfolioItemDto } from './DTO/update-portfolio-item.dto';
import { PortfolioService } from './portfolio.service';

@UseGuards(AuthGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  // ========================================
  // CRIAR ITEM
  // POST /portfolio
  // ========================================

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreatePortfolioItemDto,
  ): Promise<PortfolioItem> {
    return this.portfolioService.create(user.sub, dto);
  }

  // ========================================
  // MEU PORTFÓLIO
  // GET /portfolio/my
  // ========================================

  @Get('my')
  findMyPortfolio(
    @CurrentUser() user: { sub: string },
  ): Promise<PortfolioItem[]> {
    return this.portfolioService.findMyPortfolio(user.sub);
  }

  // ========================================
  // PORTFÓLIO DE UM PROFISSIONAL
  // GET /portfolio/professional/:professionalProfileId
  // ========================================

  @Get('professional/:professionalProfileId')
  findByProfessionalId(
    @Param('professionalProfileId')
    professionalProfileId: string,
  ): Promise<PortfolioItem[]> {
    return this.portfolioService.findByProfessionalId(professionalProfileId);
  }

  // ========================================
  // OBTER ITEM
  // GET /portfolio/:id
  // ========================================

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PortfolioItem> {
    return this.portfolioService.findOne(id);
  }

  // ========================================
  // ATUALIZAR ITEM
  // PATCH /portfolio/:id
  // ========================================

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdatePortfolioItemDto,
  ): Promise<PortfolioItem> {
    return this.portfolioService.update(id, user.sub, dto);
  }

  // ========================================
  // REMOVER ITEM
  // DELETE /portfolio/:id
  // ========================================

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ): Promise<{ message: string }> {
    return this.portfolioService.remove(id, user.sub);
  }
}
