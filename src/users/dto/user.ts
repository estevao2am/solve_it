import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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
