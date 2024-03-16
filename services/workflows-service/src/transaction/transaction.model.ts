import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TransactionModel {
  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  id!: string;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  name!: string;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  displayName!: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  transactionStatus?: string;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  logoImageUri!: string;

  @ApiProperty({
    required: true,
    type: String,
  })
  @IsString()
  faviconImageUri!: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  language?: string;
  @ApiProperty({
    type: String,
  })
  @IsString()
  country?: string;
}
