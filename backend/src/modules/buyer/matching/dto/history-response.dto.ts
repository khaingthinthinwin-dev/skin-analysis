import { PaginationMetaDto } from './recommendation-result.dto';

export class HistoryProductDto {
  id: string;
  name: string;
  slug: string;
  price: string;
  images: string[];
  matchScore: number | null;
}

export class HistorySessionDto {
  sessionId: string;
  sessionDate: string;
  skinTypesUsed: string[];
  products: HistoryProductDto[];
}

export class HistoryResponseDto {
  data: HistorySessionDto[];
  meta: PaginationMetaDto;
}
