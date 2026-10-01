import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { PortfolioItem } from '@prisma/client';

import { AuthGuard } from 'src/users/auth.guard';
import { CurrentUser } from 'src/users/decorator/current-user.decorator';

import { CreatePortfolioItemDto } from './DTO/create-portfolio-dto';
import { UpdatePortfolioItemDto } from './DTO/update-portfolio-item.dto';
import { PortfolioService } from './portfolio.service';
import { multerConfig } from 'src/config/multer';

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

  @Post(':portfolioItemId/images')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  addImage(
    @Param('portfolioItemId') portfolioItemId: string,
    @CurrentUser() user: { sub: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('É necessário enviar uma imagem');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('O ficheiro enviado deve ser uma imagem');
    }

    return this.portfolioService.addImage(portfolioItemId, user.sub, file);
  }

  @Delete('images/:imageId')
  removeImage(
    @Param('imageId') imageId: string,
    @CurrentUser() user: { sub: string },
  ): Promise<{ message: string }> {
    return this.portfolioService.removeImage(imageId, user.sub);
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
