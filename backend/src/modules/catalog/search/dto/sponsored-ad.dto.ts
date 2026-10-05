import { ApiProperty } from '@nestjs/swagger';

export class SponsoredAdDto {
  @ApiProperty() id: string;
  @ApiProperty() placement: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ nullable: true }) imageUrl: string | null;
  @ApiProperty({ nullable: true }) linkUrl: string | null;
  @ApiProperty({ nullable: true }) productSlug: string | null;
  @ApiProperty({ nullable: true }) productId: string | null;
  @ApiProperty({ nullable: true }) product_id: string | null;
  @ApiProperty({ nullable: true }) target_url: string | null;
  @ApiProperty() tier: string;
  @ApiProperty() approvalStatus: string;
  @ApiProperty({ nullable: true }) startsAt: Date | null;
  @ApiProperty({ nullable: true }) expiresAt: Date | null;
}

export class AdsResponseDto {
  @ApiProperty({ type: [SponsoredAdDto] }) data: SponsoredAdDto[];
}
