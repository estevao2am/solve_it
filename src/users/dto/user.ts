import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  CITY_MESSAGE,
  CITY_REGEX,
  POSTAL_CODE_MESSAGE,
  POSTAL_CODE_REGEX,
  TrimSpaces,
} from 'src/common/portuguese-address';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  first_name!: string;

  @IsNotEmpty()
  @IsString()
  last_name!: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  postal_code!: string;

  @IsOptional()
  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  phone!: string;

  @IsNotEmpty()
  @IsString()
  password_hash!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  first_name!: string;

  @IsOptional()
  @IsString()
  last_name!: string;

  // Morada inserida manualmente (mesmas regras dos pedidos)
  @TrimSpaces()
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Indica a rua e o nº de porta' })
  @MaxLength(150)
  address!: string;

  @TrimSpaces()
  @IsOptional()
  @IsString()
  @Matches(POSTAL_CODE_REGEX, { message: POSTAL_CODE_MESSAGE })
  postal_code!: string;

  @TrimSpaces()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(CITY_REGEX, { message: CITY_MESSAGE })
  city!: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email!: string;
}

// Configuração inicial da conta (onboarding): tudo opcional
export class CompleteOnboardingDto {
  @TrimSpaces()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(CITY_REGEX, { message: CITY_MESSAGE })
  city?: string;

  @TrimSpaces()
  @IsOptional()
  @IsString()
  @Matches(POSTAL_CODE_REGEX, { message: POSTAL_CODE_MESSAGE })
  postal_code?: string;
}

export class LoginUserDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;
  @IsNotEmpty()
  @IsString()
  password_hash!: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refresh_token!: string;
}

export class ChangePasswordDto {
  @IsString()
  current_password!: string;

  @IsString()
  @MinLength(6)
  new_password!: string;
}

// As contas são criadas com o e-mail em minúsculas
const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

export class EmailDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Introduz um e-mail válido' })
  email!: string;
}

export class VerifyResetCodeDto extends EmailDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'O código tem 6 dígitos' })
  code!: string;
}

export class ResetPasswordDto extends VerifyResetCodeDto {
  @IsString()
  @MinLength(6, {
    message: 'A palavra-passe deve ter pelo menos 6 caracteres',
  })
  @MaxLength(128)
  new_password!: string;
}
