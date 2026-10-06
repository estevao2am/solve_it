// ============================================================
// MAPAS — VERSÃO FINAL (desativado)
// Pesquisa de moradas enquanto se escreve (Google Places / Photon).
// Não está registado na API: as moradas são inseridas manualmente.
// Para reativar, ver os comentários em src/location/location.module.ts.
// ============================================================

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import {
  AddressProvider,
  AddressSuggestion,
  asPostalCode,
} from '../address-suggestion';

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id: number;
    osm_type: string;
    type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    locality?: string;
    county?: string;
    state?: string;
    countrycode?: string;
  };
};

// Photon (OpenStreetMap): pensado para pesquisa enquanto se escreve.
// O servidor público é "fair use" e pode demorar vários segundos; usado
// quando não há chave da Google (GOOGLE_PLACES_API_KEY).
export const DEFAULT_PHOTON_URL = 'https://photon.komoot.io/api/';
const REQUEST_TIMEOUT_MS = 8000;

// Continente, Madeira e Açores. A caixa apanha também parte de Espanha,
// por isso os resultados são filtrados por countrycode === 'PT'.
const PORTUGAL_BBOX = '-31.6,29.9,-6.1,42.2';

const MIN_QUERY_LENGTH = 3;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

const ADDRESS_TYPES = new Set(['house', 'street']);
const PLACE_TYPES = new Set(['city', 'district', 'locality']);

export class PhotonAddressProvider implements AddressProvider {
  readonly name = 'photon';
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: AddressSuggestion[] }
  >();

  constructor(
    private readonly http: HttpService,
    private readonly url: string,
  ) {}

  async search(query: string): Promise<AddressSuggestion[]> {
    const key = query.toLowerCase();
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const { streetQuery, houseNumber } = splitHouseNumber(query);
    let suggestions = await this.fetch(query);

    // O número de porta escrito pode não existir no mapa: procura só a
    // rua e junta-lhe o número (como na Revolut).
    if (houseNumber) {
      if (suggestions.length === 0 && streetQuery.length >= MIN_QUERY_LENGTH) {
        suggestions = await this.fetch(streetQuery);
      }
      suggestions = suggestions.map((suggestion) =>
        withHouseNumber(suggestion, houseNumber),
      );
    }

    suggestions = dedupe(suggestions);
    this.remember(key, suggestions);

    return suggestions;
  }

  private async fetch(query: string) {
    const response = await firstValueFrom(
      this.http.get<{ features: PhotonFeature[] }>(this.url, {
        params: { q: query, limit: 15, bbox: PORTUGAL_BBOX },
        headers: { 'User-Agent': 'Solve/1.0 (no-reply@solve.local)' },
        timeout: REQUEST_TIMEOUT_MS,
      }),
    );

    return (response.data?.features ?? [])
      .filter((feature) => feature.properties.countrycode === 'PT')
      .map(toSuggestion)
      .filter((suggestion) => suggestion !== null);
  }

  private remember(key: string, value: AddressSuggestion[]) {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      // Map mantém a ordem de inserção: remove a entrada mais antiga
      for (const oldest of this.cache.keys()) {
        this.cache.delete(oldest);
        break;
      }
    }

    this.cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  }
}

function toSuggestion(feature: PhotonFeature): AddressSuggestion | null {
  const p = feature.properties;
  const type = p.type ?? '';
  const [longitude, latitude] = feature.geometry.coordinates;

  const postalCode = asPostalCode(p.postcode);
  const city = p.city ?? p.district ?? p.locality ?? p.county ?? null;
  const base = {
    id: `${p.osm_type}${p.osm_id}`,
    source: 'osm' as const,
    resolved: true,
    postalCode,
    latitude,
    longitude,
  };

  // Morada/rua: usa sempre o nome completo da rua (alguns pontos do OSM
  // têm nomes abreviados, ex.: "R Álv Aug Rodrig Vilela (X)").
  if (ADDRESS_TYPES.has(type)) {
    const street = p.street ?? (type === 'street' ? p.name : undefined);
    if (!street) return null;

    const houseNumber = p.housenumber ?? null;

    // Negócios numa morada (ex.: "Hotel Tivoli", "Vigordent") não são o
    // que o utilizador procura quando escreve uma morada.
    if (type === 'house' && p.name && houseNumber) return null;

    return {
      ...base,
      label: houseNumber ? `${street}, ${houseNumber}` : street,
      secondary: [postalCode, city].filter(Boolean).join(' '),
      kind: houseNumber ? 'address' : 'street',
      street,
      houseNumber,
      city,
    };
  }

  // Localidades (cidade, freguesia, bairro)
  if (PLACE_TYPES.has(type) && p.name) {
    // Sem repetições (ex.: "Porto, Porto")
    const region = [
      ...new Set(
        [p.city !== p.name ? p.city : null, p.county ?? p.state].filter(
          (part): part is string => !!part,
        ),
      ),
    ].join(', ');

    return {
      ...base,
      label: p.name,
      secondary: [postalCode, region].filter(Boolean).join(' · '),
      kind: 'place',
      street: null,
      houseNumber: null,
      city: type === 'city' ? p.name : city,
    };
  }

  // Pontos de interesse, concelhos, distritos, etc. não são moradas
  return null;
}

// Uma linha por morada e cidade: os vários troços da mesma rua (com
// códigos postais diferentes) ficam no primeiro, que é o mais relevante.
function dedupe(suggestions: AddressSuggestion[]) {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const key = `${suggestion.label}|${suggestion.city ?? ''}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Palavras que seguem números que fazem parte do nome da rua
// (ex.: "Rua 25 de Abril", "Avenida 5 de Outubro").
const STREET_NAME_CONNECTORS = new Set(['de', 'do', 'da', 'dos', 'das']);
const HOUSE_NUMBER_TOKEN = /^\d{1,4}[a-z]?$/i;
const NUMBER_PREFIX_TOKEN = /^(n|nº|n\.º|no|n\.)$/i;

/**
 * Separa o número de porta do resto do texto escrito.
 * "rua augusta 25 lisboa" → { streetQuery: "rua augusta lisboa", houseNumber: "25" }
 * "rua 25 de abril"       → sem número de porta
 */
export function splitHouseNumber(query: string): {
  streetQuery: string;
  houseNumber: string | null;
} {
  const tokens = query.split(/[\s,]+/).filter(Boolean);

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i].replace(/^n\.?º/i, '');
    const next = tokens[i + 1]?.toLowerCase();

    if (
      HOUSE_NUMBER_TOKEN.test(token) &&
      !(next && STREET_NAME_CONNECTORS.has(next))
    ) {
      const start =
        i > 0 && NUMBER_PREFIX_TOKEN.test(tokens[i - 1]) ? i - 1 : i;
      const rest = [...tokens.slice(0, start), ...tokens.slice(i + 1)];

      return { streetQuery: rest.join(' '), houseNumber: token.toUpperCase() };
    }
  }

  return { streetQuery: query, houseNumber: null };
}

// Rua sem número → junta o número de porta escrito pelo utilizador
function withHouseNumber(
  suggestion: AddressSuggestion,
  houseNumber: string,
): AddressSuggestion {
  if (suggestion.kind !== 'street' || !suggestion.street) {
    return suggestion;
  }

  return {
    ...suggestion,
    kind: 'address',
    label: `${suggestion.street}, ${houseNumber}`,
    houseNumber,
  };
}
