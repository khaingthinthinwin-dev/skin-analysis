import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { join, normalize, extname } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import {
  ImageMetadata,
  extensionFor,
  readImageMetadata,
} from '../utils/image-metadata.util';

/**
 * Local-disk storage for facial scan images and mesh overlays.
 *
 * Blob URLs are relative paths (e.g. `/uploads/skin-scans/...`) served by
 * `app.useStaticAssets(uploadsPath, { prefix: '/uploads' })` in main.ts and
 * mirrored by the product image handling in the catalog module.
 */
@Injectable()
export class SkinScanStorageService {
  private readonly logger = new Logger(SkinScanStorageService.name);

  private readonly baseDir = join(process.cwd(), 'uploads', 'skin-scans');

  /**
   * Validates header bytes and stores a facial scan under
   * `scans/{userId}/{uuid}_{timestamp}.{ext}` (mirrors DD-05 §2.1).
   */
  saveScan(
    userId: string,
    file: {
      buffer: Buffer;
      originalname?: string;
    },
  ): {
    blobUrl: string;
    metadata: ImageMetadata;
    fileSize: number;
  } {
    const metadata = readImageMetadata(file.buffer);
    if (!metadata) {
      throw new BadRequestException({
        errorCode: '40001',
        message: 'Unsupported file format. Only JPG, PNG and WebP are allowed.',
      });
    }

    const subDir = join(this.baseDir, userId);
    this.ensureDir(subDir);

    const filename = `${randomUUID()}_${Date.now()}${extensionFor(metadata.format)}`;
    const absolutePath = join(subDir, filename);
    writeFileSync(absolutePath, file.buffer);

    const blobUrl = `/uploads/skin-scans/${userId}/${filename}`;
    return { blobUrl, metadata, fileSize: file.buffer.length };
  }

  /**
   * Persists a generated SVG mesh overlay and returns its public URL.
   */
  saveMeshSvg(analysisId: string, svg: string): string {
    const meshesDir = join(this.baseDir, 'meshes');
    this.ensureDir(meshesDir);
    const filename = `${analysisId}.svg`;
    writeFileSync(join(meshesDir, filename), svg, 'utf8');
    return `/uploads/skin-scans/meshes/${filename}`;
  }

  /**
   * Resolves a storage-relative blob URL to the on-disk file path.
   * Returns null when the path does not exist.
   */
  resolveLocalPath(blobUrl: string): string | null {
    if (!blobUrl.startsWith('/uploads/')) return null;
    const relative = blobUrl.replace(/^\/uploads\//, '');
    const uploadsRoot = join(process.cwd(), 'uploads');
    const absolute = normalize(join(uploadsRoot, relative));
    if (!absolute.startsWith(normalize(uploadsRoot))) return null;
    return existsSync(absolute) ? absolute : null;
  }

  getContentType(blobUrl: string): string {
    const ext = extname(blobUrl).toLowerCase().replace('.', '');
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'application/octet-stream';
  }

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
