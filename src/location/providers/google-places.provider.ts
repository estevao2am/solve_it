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

type GoogleAutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId: string;
      text?: { text: string };
      structuredFormat?: {
        mainText?: { text: string };
        secondaryText?: { text: string };
      };
      types?: string[];
    };
  }[];
};

type GooglePlace = {
  id: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  addressComponents?: {
    longText: string;
    shortText: string;
    types: string[];
  }[];
};

const API_URL = 'https://places.googleapis.com/v1';
const REQUEST_TIMEOUT_MS = 5000;

// Só moradas (Tabela B dos tipos da Places API; máximo 5)
const ADDRESS_TYPES = [
  'street_address',
  'premise',
  'subpremise',
  'route',
  'postal_code',
];

// Place Details "Essentials": o nível mais barato que traz a morada
const DETAILS_FIELD_MASK = 'id,formattedAddress,location,addressComponents';

/**
 * Google Places API (New), em dois passos (como na Revolut):
 * 1. Autocomplete enquanto se escreve → lista (só texto);
 * 2. Place Details ao escolher → rua, nº, código postal, cidade, coordenadas.
 * O mesmo sessionToken nos dois pedidos faz a Google cobrar como uma sessão.
 */
export class GooglePlacesAddressProvider implements AddressProvider {
  readonly name = 'google';

  constructor(
    private readonly http: HttpService,
    private readonly apiKey: string,
  ) {}

  async search(
    query: string,
    sessionToken?: string,
  ): Promise<AddressSuggestion[]> {
    const response = await firstValueFrom(
      this.http.post<GoogleAutocompleteResponse>(
        `${API_URL}/places:autocomplete`,
        {
          input: query,
          includedRegionCodes: ['pt'],
          regionCode: 'pt',
          languageCode: 'pt-PT',
          includedPrimaryTypes: ADDRESS_TYPES,
          ...(sessionToken ? { sessionToken } : {}),
        },
        {
          headers: { 'X-Goog-Api-Key': this.apiKey },
          timeout: REQUEST_TIMEOUT_MS,
        },
      ),
    );

    return (response.data?.suggestions ?? []).flatMap(({ placePrediction }) =>
      placePrediction ? [toSuggestion(placePrediction)] : [],
    );
  }

  async details(
    placeId: string,
    sessionToken?: string,
  ): Promise<AddressSuggestion | null> {
    const response = await firstValueFrom(
      this.http.get<GooglePlace>(
        `${API_URL}/places/${encodeURIComponent(placeId)}`,
        {
          params: {
            languageCode: 'pt-PT',
            regionCode: 'pt',
            ...(sessionToken ? { sessionToken } : {}),
          },
          headers: {
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': DETAILS_FIELD_MASK,
          },
          timeout: REQUEST_TIMEOUT_MS,
        },
      ),
    );

    return response.data ? fromPlace(response.data) : null;
  }
}

type Prediction = NonNullable<
  NonNullable<
    GoogleAutocompleteResponse['suggestions']
  >[number]['placePrediction']
>;

function toSuggestion(prediction: Prediction): AddressSuggestion {
  const types = prediction.types ?? [];
  const label =
    prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '';
  const secondary = (prediction.structuredFormat?.secondaryText?.text ?? '')
    .replace(/,?\s*Portugal$/i, '')
    .trim();

  return {
    id: prediction.placeId,
    label,
    secondary,
    kind: types.includes('route')
      ? 'street'
      : types.some((type) =>
            ['street_address', 'premise', 'subpremise'].includes(type),
          )
        ? 'address'
        : 'place',
    source: 'google',
    resolved: false,
    street: null,
    houseNumber: null,
    postalCode: null,
    city: null,
    latitude: null,
    longitude: null,
  };
}

function fromPlace(place: GooglePlace): AddressSuggestion {
  const component = (type: string) =>
    place.addressComponents?.find((item) => item.types.includes(type))
      ?.longText ?? null;

  const street = component('route');
  const houseNumber = component('street_number');
  const postalCode = asPostalCode(component('postal_code'));
  const city =
    component('locality') ??
    component('postal_town') ??
    component('administrative_area_level_2') ??
    component('administrative_area_level_1');

  const label = street
    ? houseNumber
      ? `${street}, ${houseNumber}`
      : street
    : (place.formattedAddress?.split(',')[0] ?? '');

  return {
    id: place.id,
    label,
    secondary: [postalCode, city].filter(Boolean).join(' '),
    kind: houseNumber ? 'address' : street ? 'street' : 'place',
    source: 'google',
    resolved: true,
    street,
    houseNumber,
    postalCode,
    city,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
  };
}
