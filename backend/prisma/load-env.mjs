import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, '..');
const repoRoot = resolve(backendRoot, '..');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return false;

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

  return true;
}

export function loadPrismaEnv() {
  const loadedPaths = [];
  const backendEnv = resolve(backendRoot, '.env');
  const repoEnv = resolve(repoRoot, '.env');

  if (loadEnvFile(backendEnv)) loadedPaths.push(backendEnv);
  if (loadEnvFile(repoEnv)) loadedPaths.push(repoEnv);

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    console.error('Checked:');
    console.error(`  - ${backendEnv}`);
    console.error(`  - ${repoEnv}`);
    console.error('Create one of them from .env.example:');
    console.error('  cp .env.example .env');
    process.exit(1);
  }

  return { backendRoot, repoRoot, loadedPaths };
}
