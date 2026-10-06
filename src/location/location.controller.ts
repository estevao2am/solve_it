// ============================================================
// MAPAS — VERSÃO FINAL (desativado)
// Pesquisa de moradas enquanto se escreve (Google Places / Photon).
// Não está registado na API: as moradas são inseridas manualmente.
// Para reativar, ver os comentários em src/location/location.module.ts.
// ============================================================

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from 'src/users/auth.guard';
import { AddressAutocompleteService } from './address-autocomplete.service';

// Token de sessão gerado pela app (agrupa pesquisa + detalhe na Google)
const SESSION_TOKEN = /^[A-Za-z0-9_-]{1,36}$/;

@UseGuards(AuthGuard)
@Controller('location')
export class LocationController {
  constructor(
    private readonly addressAutocomplete: AddressAutocompleteService,
  ) {}

  // ========================================
  // PESQUISA DE MORADAS EM PORTUGAL (enquanto se escreve)
  // GET /location/autocomplete?q=rua augusta&session=<token>
  // ========================================
  @Get('autocomplete')
  async autocomplete(
    @Query('q') query?: string,
    @Query('session') session?: string,
  ) {
    return this.addressAutocomplete.search(query ?? '', validSession(session));
  }

  // ========================================
  // DETALHE DA MORADA ESCOLHIDA (rua, nº, código postal, cidade)
  // GET /location/place/:id?session=<token>
  // ========================================
  @Get('place/:id')
  async place(@Param('id') id: string, @Query('session') session?: string) {
    if (!/^[A-Za-z0-9_-]{1,300}$/.test(id)) {
      throw new BadRequestException('Identificador de morada inválido');
    }

    return this.addressAutocomplete.details(id, validSession(session));
  }
}

function validSession(session?: string) {
  return session && SESSION_TOKEN.test(session) ? session : undefined;
}
