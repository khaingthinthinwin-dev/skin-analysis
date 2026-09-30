import { IsBoolean, IsNotEmpty } from 'class-validator';

export class RecommendationFeedbackDto {
  @IsNotEmpty()
  @IsBoolean()
  isHelpful: boolean;
}
