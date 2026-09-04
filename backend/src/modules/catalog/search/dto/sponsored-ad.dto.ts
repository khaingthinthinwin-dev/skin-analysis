import { ApiProperty } from '@nestjs/swagger';

export class SponsoredAdDto {
  @ApiProperty() id: string;
  @ApiProperty() placement: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ nullable: true }) imageUrl: string | null;
  @ApiProperty({ nullable: true }) linkUrl: string | null;
  @ApiProperty() tier: string;
  @ApiProperty() approvalStatus: string;
  @ApiProperty() startsAt: Date;
  @ApiProperty() expiresAt: Date;
}

export class AdsResponseDto {
  @ApiProperty({ type: [SponsoredAdDto] }) data: SponsoredAdDto[];
}
