import { Type } from 'class-transformer';
import { IsInt, Min, isString } from 'class-validator';

export class AddOrderItemDto {
  @Type(() => isString)
  @IsInt()
  product_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}
