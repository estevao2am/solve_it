// ============================================================
// MAPAS — VERSÃO FINAL (desativado)
// Pesquisa de moradas enquanto se escreve (Google Places / Photon).
// Não está registado na API: as moradas são inseridas manualmente.
// Para reativar, ver os comentários em src/location/location.module.ts.
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { AddressProvider, AddressSuggestion } from './address-suggestion';
import { GooglePlacesAddressProvider } from './providers/google-places.provider';
import {
  DEFAULT_PHOTON_URL,
  PhotonAddressProvider,
} from './providers/photon.provider';

export type { AddressSuggestion } from './address-suggestion';

const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 6;

/**
 * Pesquisa de moradas em Portugal enquanto se escreve.
 * - Com GOOGLE_PLACES_API_KEY: Google Places (recomendado).
 * - Sem chave: Photon/OpenStreetMap (PHOTON_URL ou o servidor público).
 */
@Injectable()
export class AddressAutocompleteService {
  private readonly logger = new Logger(AddressAutocompleteService.name);
  private readonly provider: AddressProvider;

  constructor(http: HttpService, config: ConfigService) {
    const googleKey = config.get<string>('GOOGLE_PLACES_API_KEY');

    this.provider = googleKey
      ? new GooglePlacesAddressProvider(http, googleKey)
      : new PhotonAddressProvider(
          http,
          config.get<string>('PHOTON_URL') || DEFAULT_PHOTON_URL,
        );

    this.logger.log(`Pesquisa de moradas: ${this.provider.name}`);
  }

  /**
   * Moradas que correspondem ao texto escrito.
   * Sem resultados (ou com falha do provider) devolve [].
   */
  async search(
    rawQuery: string,
    sessionToken?: string,
  ): Promise<AddressSuggestion[]> {
    const query = rawQuery.trim().replace(/\s+/g, ' ').slice(0, 100);

    if (query.length < MIN_QUERY_LENGTH) {
      return [];
    }

    try {
      const suggestions = await this.provider.search(query, sessionToken);
      return suggestions.slice(0, MAX_RESULTS);
    } catch (error) {
      this.logger.warn(
        `Pesquisa de moradas (${this.provider.name}) falhou para "${query}": ${describe(error)}`,
      );
      return [];
    }
  }

  /**
   * Detalhe de uma sugestão (rua, nº, código postal, cidade, coordenadas).
   * Só necessário quando a sugestão vem com resolved = false (Google).
   */
  async details(id: string, sessionToken?: string) {
    if (!this.provider.details) {
      throw new NotFoundException('Morada não encontrada');
    }

    try {
      const suggestion = await this.provider.details(id, sessionToken);
      if (suggestion) return suggestion;
    } catch (error) {
      this.logger.warn(
        `Detalhe de morada (${this.provider.name}) falhou para "${id}": ${describe(error)}`,
      );
    }

    throw new NotFoundException('Morada não encontrada');
  }
}

function describe(error: unknown) {
  // Erros da Google trazem o motivo no corpo (ex.: chave inválida)
  const response = (error as { response?: { status?: number; data?: unknown } })
    ?.response;

  if (response) {
    return `HTTP ${response.status} ${JSON.stringify(response.data)}`;
  }

  return error instanceof Error ? error.message : String(error);
}
