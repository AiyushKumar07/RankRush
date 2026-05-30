import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TopNQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  // Set "me" to return ±window neighbours instead of a top-N page.
  @IsOptional()
  @IsEnum(['me', 'top'])
  view?: 'me' | 'top' = 'top';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  window?: number = 5;
}
