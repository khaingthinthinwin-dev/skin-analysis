import { ApiProperty } from '@nestjs/swagger';

export class CategoryNodeDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ nullable: true }) iconUrl: string | null;
  @ApiProperty() sortOrder: number;
  @ApiProperty({ type: [CategoryNodeDto] }) children: CategoryNodeDto[];
}

export class CategoryTreeResponseDto {
  @ApiProperty({ type: [CategoryNodeDto] }) data: CategoryNodeDto[];
}
