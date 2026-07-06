#!/usr/bin/env node
/**
 * Pre-flight checks before functional QA.
 * Usage: pnpm preflight
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');
let failed = 0;

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed += 1;
}

function run(cmd) {
  return execSync(cmd, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
}

console.log('AGROERP — Pre-flight checks\n');

if (!existsSync(resolve(root, '.env'))) {
  fail('.env missing — run: cp .env.example .env');
} else {
  ok('.env present');
}

try {
  run('docker info >/dev/null 2>&1');
  ok('Docker daemon running');
  const ps = run('docker ps --filter name=agroerp-postgres --format "{{.Status}}"');
  if (ps.includes('Up')) ok('PostgreSQL container up');
  else fail('PostgreSQL container not running — run: pnpm docker:infra');
} catch {
  fail('Docker not available — start Docker Desktop');
}

try {
  const health = run('curl -sf http://localhost:3080/api/v1/health');
  const parsed = JSON.parse(health);
  if (parsed.status === 'healthy') ok(`Backend healthy (${parsed.services?.database ?? 'db'})`);
  else fail(`Backend unhealthy: ${health}`);
} catch {
  fail('Backend not reachable at :3080 — run: pnpm dev (with docker:infra up)');
}

console.log('');
if (failed) {
  console.error(`${failed} check(s) failed. Fix before starting QA.`);
  process.exit(1);
}
console.log('All pre-flight checks passed. Ready for functional QA.');
process.exit(0);
