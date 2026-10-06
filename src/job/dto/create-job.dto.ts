import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  CITY_MESSAGE,
  CITY_REGEX,
  HOUSE_NUMBER_MESSAGE,
  HOUSE_NUMBER_REGEX,
  POSTAL_CODE_MESSAGE,
  POSTAL_CODE_REGEX,
  TrimSpaces,
} from 'src/common/portuguese-address';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(150)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  description!: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  // ----------------------------------------
  // Morada (inserida manualmente, por partes)
  // ----------------------------------------

  @TrimSpaces()
  @IsString()
  @MinLength(3, { message: 'Indica o nome da rua' })
  @MaxLength(120)
  street!: string;

  @TrimSpaces()
  @IsString()
  @Matches(HOUSE_NUMBER_REGEX, { message: HOUSE_NUMBER_MESSAGE })
  houseNumber!: string;

  // Andar, fração, bloco… (opcional)
  @TrimSpaces()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  complement?: string;

  @TrimSpaces()
  @IsString()
  @Matches(POSTAL_CODE_REGEX, { message: POSTAL_CODE_MESSAGE })
  postal_code!: string;

  @TrimSpaces()
  @IsString()
  @MinLength(2, { message: 'Indica a localidade' })
  @MaxLength(80)
  @Matches(CITY_REGEX, { message: CITY_MESSAGE })
  city!: string;
}
