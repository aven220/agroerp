#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadPrismaEnv } from './load-env.mjs';

const { backendRoot } = loadPrismaEnv();
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node prisma/run-with-env.mjs <prisma-args...>');
  console.error('Example: node prisma/run-with-env.mjs generate --schema prisma/schema.prisma');
  process.exit(1);
}

const prismaBin = resolve(backendRoot, 'node_modules', '.bin', 'prisma');
const result = spawnSync(prismaBin, args, {
  stdio: 'inherit',
  env: process.env,
  cwd: backendRoot,
});

process.exit(result.status ?? 1);
