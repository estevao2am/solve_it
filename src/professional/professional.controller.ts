import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from 'src/users/auth.guard';
import { CurrentUser } from 'src/users/decorator/current-user.decorator';

import { CreateProfessionalDto } from './create-professional';
import { UpdateProfessionalDto } from './update-professional';
import { ProfessionalProfileService } from './professional.service';

@Controller('professionals')
export class ProfessionalProfileController {
  constructor(
    private readonly professionalService: ProfessionalProfileService,
  ) {}

  /**
   * Criar perfil profissional
   */
  @Post()
  @UseGuards(AuthGuard)
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateProfessionalDto,
  ) {
    return this.professionalService.create(user.sub, dto);
  }

  /**
   * Obter o meu perfil profissional
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async findMyProfile(@CurrentUser() user: { sub: string }) {
    return this.professionalService.findMyProfile(user.sub);
  }

  /**
   * Atualizar o meu perfil profissional
   */
  @Patch('me')
  @UseGuards(AuthGuard)
  async update(
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateProfessionalDto,
  ) {
    return this.professionalService.update(user.sub, dto);
  }

  /**
   * Aprovar profissional
   *
   * Exemplo:
   * PATCH /professionals/123
   */
  @Patch(':id')
  async approve(@Param('id') id: string) {
    return this.professionalService.updateStatus(id);
  }

  /**
   * Listar profissionais aprovados
   */
  @Get('approved')
  async findApproved() {
    return this.professionalService.findApproved();
  }

  /**
   * Listar todos os profissionais
   *
   * Idealmente este endpoint deve ser apenas para ADMIN.
   */
  @Get()
  async findAll() {
    return this.professionalService.findAll();
  }

  /**
   * Obter profissional pelo ID
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.professionalService.findById(id);
  }
}
