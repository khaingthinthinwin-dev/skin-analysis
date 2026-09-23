import { IsOptional, IsUUID } from 'class-validator';

export class MerchantScopeQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'Invalid merchantId' })
  merchantId?: string;
}
