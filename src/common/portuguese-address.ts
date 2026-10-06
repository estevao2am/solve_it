import { Transform } from 'class-transformer';

// Regras para moradas portuguesas inseridas manualmente
// (partilhadas pelos pedidos e pelo perfil do utilizador).

// Código postal CP7: 0000-000
export const POSTAL_CODE_REGEX = /^\d{4}-\d{3}$/;
export const POSTAL_CODE_MESSAGE =
  'O código postal deve ter o formato 0000-000';

// Nº de porta: "25", "25A", "25-27" ou "s/n" (sem número)
export const HOUSE_NUMBER_REGEX =
  /^(\d{1,5}[A-Za-z]?(-\d{1,5}[A-Za-z]?)?|s\/n)$/i;
export const HOUSE_NUMBER_MESSAGE =
  'Indica o nº de porta (ex.: 25, 25A, 25-27 ou s/n)';

// Localidade: letras (com acentos), espaços, hífen, apóstrofo e ponto
export const CITY_REGEX = /^[\p{L} .'-]+$/u;
export const CITY_MESSAGE = 'A localidade só pode ter letras';

// Remove espaços a mais antes de validar (ex.: "  Rua  Augusta ")
export function TrimSpaces() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  );
}

// "Rua Augusta" + "25" + "2.º Esq." → "Rua Augusta, 25, 2.º Esq."
export function composeAddressLine(
  street: string,
  houseNumber: string,
  complement?: string | null,
) {
  return [street, houseNumber.toLowerCase() === 's/n' ? 's/n' : houseNumber]
    .concat(complement ? [complement] : [])
    .join(', ');
}
