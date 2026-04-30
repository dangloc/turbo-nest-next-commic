import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateNovelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  postContent!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultChapterPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeChapterCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  comboDiscountPct?: number;

  @IsOptional()
  @IsString()
  featuredImage?: string;

  /** Term IDs to connect to this novel */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  termIds?: number[];
}
