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

const BUILD_STUB_BASE = 'postgresql://build:build@127.0.0.1:5432/agroerp';

const BUILD_STUB_SCHEMAS = {
  DATABASE_URL: 'public',
  DATABASE_URL_BPMS: 'bpms',
  DATABASE_URL_EIP: 'eip',
  DATABASE_URL_EINT: 'eint',
  DATABASE_URL_EOPS: 'eops',
  DATABASE_URL_EATP: 'eatp',
  DATABASE_URL_EAPP: 'eapp',
  DATABASE_URL_EIWP: 'eiwp',
  DATABASE_URL_EPHP: 'ephp',
  DATABASE_URL_EATR: 'eatr',
  DATABASE_URL_EACC: 'eacc',
  DATABASE_URL_EFFM: 'effm',
  DATABASE_URL_EAIP: 'eaip',
  DATABASE_URL_EACE: 'eace',
};

function applyBuildStubDatabaseUrls() {
  for (const [key, schema] of Object.entries(BUILD_STUB_SCHEMAS)) {
    if (!process.env[key]) {
      process.env[key] = `${BUILD_STUB_BASE}?schema=${schema}`;
    }
  }
}

export function loadPrismaEnv() {
  const loadedPaths = [];
  const backendEnv = resolve(backendRoot, '.env');
  const repoEnv = resolve(repoRoot, '.env');

  if (loadEnvFile(backendEnv)) loadedPaths.push(backendEnv);
  if (loadEnvFile(repoEnv)) loadedPaths.push(repoEnv);

  const prismaCmd = process.argv[2];
  const isGenerate = prismaCmd === 'generate';

  if (!process.env.DATABASE_URL) {
    if (isGenerate) {
      applyBuildStubDatabaseUrls();
    } else {
      console.error('DATABASE_URL is not set.');
      console.error('Checked:');
      console.error(`  - ${backendEnv}`);
      console.error(`  - ${repoEnv}`);
      console.error('Create one of them from .env.example:');
      console.error('  cp .env.example .env');
      process.exit(1);
    }
  }

  return { backendRoot, repoRoot, loadedPaths };
}
