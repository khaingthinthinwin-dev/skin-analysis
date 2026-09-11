import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { extname } from 'path';

function ensureDirSync(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function createProductStorage() {
  const destination = join(process.cwd(), 'uploads', 'products');
  ensureDirSync(destination);

  return diskStorage({
    destination: (_req, _file, cb) => {
      ensureDirSync(destination);
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const unique = randomUUID();
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  });
}
