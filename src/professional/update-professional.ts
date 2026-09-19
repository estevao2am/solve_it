import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessionalDto } from './create-professional';

export class UpdateProfessionalDto extends PartialType(CreateProfessionalDto) {}
