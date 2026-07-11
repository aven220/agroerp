#!/usr/bin/env node
/**
 * Garantiza artefactos necesarios para el build Docker (sin OOM en Docker Desktop).
 * - infra/docker-prisma/  → pnpm docker:stage-prisma
 * - backend/dist/         → pnpm --filter @agroerp/backend build
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function run(cmd, args) {
  console.log(`\n▶ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const prismaOk = existsSync(path.join(root, 'infra/docker-prisma/dot-prisma-client/index.js'));
const distOk =
  existsSync(path.join(root, 'backend/dist/src/main.js')) ||
  existsSync(path.join(root, 'backend/dist/main.js'));

if (!prismaOk) {
  run('pnpm', ['docker:stage-prisma']);
} else {
  console.log('✓ infra/docker-prisma listo');
}

if (!distOk) {
  run('pnpm', ['--filter', '@agroerp/shared', 'build']);
  run('pnpm', ['--filter', '@agroerp/backend', 'build']);
} else {
  console.log('✓ backend/dist listo');
}

console.log('\n✓ Artefactos Docker listos');
