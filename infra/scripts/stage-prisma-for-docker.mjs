#!/usr/bin/env node
/**
 * Empaqueta clientes Prisma ya generados en el host para el build Docker.
 * Evita OOM de `prisma generate` dentro de Docker Desktop (schema ~22k líneas).
 *
 * Uso:
 *   pnpm --filter @agroerp/backend db:generate:local
 *   node infra/scripts/stage-prisma-for-docker.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const backend = path.join(root, 'backend');
const outDir = path.join(root, 'infra', 'docker-prisma');
const require = createRequire(path.join(backend, 'package.json'));

function stripHostEngines(dir) {
  for (const name of readdirSync(dir)) {
    if (name.includes('darwin') || name.endsWith('.dylib.node')) {
      unlinkSync(path.join(dir, name));
    }
  }
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Cliente principal: pnpm pone .prisma junto a @prisma bajo node_modules/
//   .../node_modules/@prisma/client  →  .../node_modules/.prisma/client
const clientPkg = path.dirname(require.resolve('@prisma/client/package.json'));
const dotPrismaClient = path.resolve(clientPkg, '../../.prisma/client');
if (!existsSync(path.join(dotPrismaClient, 'index.js'))) {
  console.error('No se encontró .prisma/client en', dotPrismaClient);
  console.error('Ejecute antes: pnpm --filter @agroerp/backend db:generate:local');
  process.exit(1);
}
if (!existsSync(path.join(dotPrismaClient, 'libquery_engine-linux-arm64-openssl-3.0.x.so.node')) &&
    !existsSync(path.join(dotPrismaClient, 'libquery_engine-debian-openssl-3.0.x.so.node'))) {
  console.error('Falta engine Linux (linux-arm64-openssl-3.0.x o debian-openssl-3.0.x). Regenere con binaryTargets.');
  process.exit(1);
}
cpSync(dotPrismaClient, path.join(outDir, 'dot-prisma-client'), { recursive: true });
stripHostEngines(path.join(outDir, 'dot-prisma-client'));
console.log('✓ staged main .prisma/client');

const agroerpDir = path.join(backend, 'node_modules', '@agroerp');
const satellites = [
  'prisma-bpms-client',
  'prisma-eip-client',
  'prisma-eint-client',
  'prisma-eops-client',
  'prisma-eatp-client',
  'prisma-eapp-client',
  'prisma-eiwp-client',
  'prisma-ephp-client',
  'prisma-eatr-client',
  'prisma-eacc-client',
  'prisma-effm-client',
  'prisma-eaip-client',
  'prisma-eace-client',
];

mkdirSync(path.join(outDir, 'agroerp'), { recursive: true });
for (const name of satellites) {
  const src = path.join(agroerpDir, name);
  if (!existsSync(src)) {
    console.error(`Falta ${src}. Ejecute db:generate:local`);
    process.exit(1);
  }
  cpSync(src, path.join(outDir, 'agroerp', name), { recursive: true });
  stripHostEngines(path.join(outDir, 'agroerp', name));
  console.log(`✓ staged @agroerp/${name}`);
}

writeFileSync(
  path.join(outDir, 'README.txt'),
  'Generado por infra/scripts/stage-prisma-for-docker.mjs — no editar a mano.\n',
);
console.log(`\n✓ Prisma listo para Docker en ${outDir}`);
