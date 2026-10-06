// ============================================================
// MAPAS — VERSÃO FINAL (desativado)
// Pesquisa de moradas enquanto se escreve (Google Places / Photon).
// Não está registado na API: as moradas são inseridas manualmente.
// Para reativar, ver os comentários em src/location/location.module.ts.
// ============================================================

// Sugestão de morada devolvida à app (igual para todos os providers)
export type AddressSuggestion = {
  id: string;
  label: string; // ex.: "Rua Augusta, 25"
  secondary: string; // ex.: "1100-048 Lisboa"
  kind: 'address' | 'street' | 'place';
  // Origem dos dados (a app mostra a atribuição correspondente)
  source: 'google' | 'osm';
  // false = só texto; a app pede o detalhe (GET /location/place/:id)
  // para obter rua, número, código postal, cidade e coordenadas.
  resolved: boolean;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null; // só no formato 0000-000
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

export interface AddressProvider {
  readonly name: string;
  search(query: string, sessionToken?: string): Promise<AddressSuggestion[]>;
  details?(
    id: string,
    sessionToken?: string,
  ): Promise<AddressSuggestion | null>;
}

export function asPostalCode(value: string | null | undefined) {
  return value && /^\d{4}-\d{3}$/.test(value) ? value : null;
}
