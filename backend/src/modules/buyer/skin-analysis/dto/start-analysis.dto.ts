import { IsNotEmpty } from 'class-validator';

/**
 * The uploaded image is stored on local disk and referenced by a relative
 * path (e.g. `/uploads/skin-scans/...`), both when passed to the analyze
 * endpoint and when returned to the client.
 */
const STORAGE_URL_PATTERN = /^(\/uploads\/[A-Za-z0-9\-._~/]+|https?:\/\/.+)$/;

export class StartAnalysisDto {
  @IsNotEmpty({ message: 'blobUrl is required' })
  blobUrl: string;
}

export function isStorageUrl(value: string): boolean {
  return STORAGE_URL_PATTERN.test(value);
}
