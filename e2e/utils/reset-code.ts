import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Client } from 'pg';

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.resolve(__dirname, '../../backend/.env');
  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(/^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
  if (!match) {
    throw new Error('DATABASE_URL not found in environment or backend/.env');
  }
  return match[1];
}

/**
 * Overwrite the latest unused password-reset token for `email`
 * so its hash matches the known 6-digit `code` (SHA-256, same as backend).
 * Must be called AFTER forgot-password has created a token row.
 */
export async function seedKnownResetCode(email: string, code: string): Promise<void> {
  const client = new Client({ connectionString: loadDatabaseUrl() });
  await client.connect();
  try {
    const hash = crypto.createHash('sha256').update(code).digest('hex');

    const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!userRes.rows.length) {
      throw new Error(`User not found for email: ${email}`);
    }
    const userId = userRes.rows[0].id;

    const tokenRes = await client.query(
      `SELECT id FROM password_reset_tokens
       WHERE user_id = $1 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (tokenRes.rows.length) {
      await client.query(`UPDATE password_reset_tokens SET token_hash = $1 WHERE id = $2`, [
        hash,
        tokenRes.rows[0].id,
      ]);
    } else {
      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used)
         VALUES ($1, $2, NOW() + INTERVAL '10 minutes', false)`,
        [userId, hash]
      );
    }
  } finally {
    await client.end();
  }
}
