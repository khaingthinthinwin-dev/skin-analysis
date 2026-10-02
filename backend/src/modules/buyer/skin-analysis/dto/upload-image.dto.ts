import { IsBoolean, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadImageDto {
  @IsNotEmpty({
    message: 'Consent is required before uploading facial images.',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'Consent must be a valid boolean.' })
  consent: boolean;
}
