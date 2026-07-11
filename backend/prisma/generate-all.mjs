#!/usr/bin/env node
/**
 * Genera todos los clientes Prisma de forma secuencial.
 * Heap configurable (Docker Desktop suele OOM con 8192):
 *   NODE_OPTIONS=--max-old-space-size=2048 node prisma/generate-all.mjs
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const runWithEnv = path.join(root, 'run-with-env.mjs');

const schemas = [
  'prisma/schema.prisma',
  'prisma/bpms/schema.prisma',
  'prisma/eip/schema.prisma',
  'prisma/eint/schema.prisma',
  'prisma/eops/schema.prisma',
  'prisma/eatp/schema.prisma',
  'prisma/eapp/schema.prisma',
  'prisma/eiwp/schema.prisma',
  'prisma/ephp/schema.prisma',
  'prisma/eatr/schema.prisma',
  'prisma/eacc/schema.prisma',
  'prisma/effm/schema.prisma',
  'prisma/eaip/schema.prisma',
  'prisma/eace/schema.prisma',
];

const heapMb = process.env.PRISMA_GENERATE_HEAP_MB || '2048';
const nodeOptions = [
  process.env.NODE_OPTIONS,
  `--max-old-space-size=${heapMb}`,
]
  .filter(Boolean)
  .join(' ')
  .replace(/--max-old-space-size=\d+/g, `--max-old-space-size=${heapMb}`);

for (const schema of schemas) {
  console.log(`\n▶ prisma generate — ${schema} (heap ${heapMb}MB)`);
  const result = spawnSync(process.execPath, [runWithEnv, 'generate', '--schema', schema], {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
    cwd: path.join(root, '..'),
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\n✓ Todos los clientes Prisma generados');
