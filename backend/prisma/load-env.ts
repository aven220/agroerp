import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/**
 * Loads DATABASE_URL and related vars from backend/.env or repo root .env
 * (same resolution order as NestJS ConfigModule).
 */
export function loadPrismaEnv(): void {
  const backendRoot = resolve(__dirname, '..');
  const repoRoot = resolve(backendRoot, '..');

  loadEnvFile(resolve(backendRoot, '.env'));
  loadEnvFile(resolve(repoRoot, '.env'));

  if (!process.env.DATABASE_URL) {
    throw new Error(
      [
        'DATABASE_URL is not set.',
        'Create .env from .env.example at repo root or backend/:',
        '  cp .env.example .env',
        'Then start PostgreSQL (e.g. pnpm docker:infra).',
      ].join(' '),
    );
  }
}
