import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

// MAPAS — versão final: pesquisa de moradas (Google Places / Photon).
// Desativada por agora; as moradas são inseridas manualmente.
// Para reativar, descomentar os imports e as linhas assinaladas abaixo.
// import { AddressAutocompleteService } from './address-autocomplete.service';
// import { LocationController } from './location.controller';
import { LocationService } from './location.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  // controllers: [LocationController], // MAPAS — versão final
  providers: [
    LocationService,
    // AddressAutocompleteService, // MAPAS — versão final
  ],
  exports: [LocationService],
})
export class LocationModule {}
