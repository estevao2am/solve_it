import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    country?: string;
    country_code?: string;
  };
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Obtém o nome da cidade/localidade através do código postal (Portugal).
   */
  async getCityFromPostalCode(postalCode: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<NominatimResult[]>(
          'https://nominatim.openstreetmap.org/search',
          {
            params: {
              postalcode: postalCode,
              country: 'Portugal',
              format: 'jsonv2',
              addressdetails: 1,
              limit: 1,
            },
            headers: {
              'User-Agent': 'ResolveAI/1.0 (contact@resolveai.pt)',
            },
            timeout: 5000,
          },
        ),
      );

      const result = response.data?.[0];

      if (!result || !result.address) {
        throw new BadRequestException(
          'Código postal não encontrado ou inválido.',
        );
      }

      const address = result.address;

      // O OSM pode retornar a cidade em diferentes propriedades dependendo da região
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county;

      if (!city) {
        throw new BadRequestException(
          'Não foi possível identificar a cidade para o código postal informado.',
        );
      }

      return city;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Erro ao consultar cidade pelo código postal', error);
      throw new BadRequestException(
        'Falha ao validar o código postal informado.',
      );
    }
  }

  /**
   * Geocodifica a morada completa. Se a cidade for omitida ou vazia,
   * resolve a cidade automaticamente através do código postal.
   */
  async resolveLocationAndGeocode(
    address: string,
    city: string | undefined,
    postalCode: string,
  ) {
    let resolvedCity = city?.trim();

    // Se a cidade não for fornecida, procura-a pelo código postal
    if (!resolvedCity) {
      resolvedCity = await this.getCityFromPostalCode(postalCode);
    }

    const locationData = await this.geocodeAddress(
      address,
      resolvedCity,
      postalCode,
    );

    return {
      ...locationData,
      resolvedCity,
    };
  }

  /**
   * Geocodifica a morada com estrutura completa no Nominatim/OSM.
   */
  async geocodeAddress(address: string, city: string, postalCode: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<NominatimResult[]>(
          'https://nominatim.openstreetmap.org/search',
          {
            params: {
              street: address,
              postalcode: postalCode,
              city: city,
              country: 'Portugal',
              format: 'jsonv2',
              addressdetails: 1,
              limit: 1,
            },
            headers: {
              'User-Agent': 'ResolveAI/1.0 (contact@resolveai.pt)',
            },
            timeout: 5000,
          },
        ),
      );

      const result = response.data?.[0];

      if (!result) {
        throw new BadRequestException(
          'Não foi possível encontrar a localização informada.',
        );
      }

      return {
        latitude: Number(result.lat),
        longitude: Number(result.lon),
        formattedAddress: result.display_name,
        address: result.address,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Erro ao consultar serviço de geocoding', error);
      throw new BadRequestException('Não foi possível validar a localização.');
    }
  }
}
