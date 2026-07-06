#!/usr/bin/env node
/**
 * Migrates legacy loading-inline divs to LoadingState component.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(import.meta.dirname, '../src/pages');
const IMPORT = "import { LoadingState } from '../components/ux/LoadingState';";

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith('.tsx')) files.push(p);
  }
  return files;
}

function pickVariant(message, context) {
  const m = message.toLowerCase();
  if (context === 'conditional') return 'table';
  if (m.includes('dashboard') || m.includes('centro') || m.includes('center') || m.includes('kpi')) {
    return 'dashboard';
  }
  if (m.includes('tabla') || m.includes('bandeja') || m.includes('reglas') || m.includes('procesos')) {
    return 'table';
  }
  return 'page';
}

function migrate(content) {
  if (!content.includes('loading-inline')) return null;

  let next = content;

  next = next.replace(
    /return\s+<div className="loading-inline">([^<]*)<\/div>;?/g,
    (_, msg) => {
      const message = msg.trim();
      const variant = pickVariant(message, 'return');
      return `return <LoadingState variant="${variant}" message="${message}" />;`;
    },
  );

  next = next.replace(
    /\{\s*loading\s*\?\s*<div className="loading-inline">([^<]*)<\/div>\s*:\s*\(/g,
    (_, msg) => {
      const message = msg.trim();
      return `{loading ? <LoadingState variant="table" message="${message}" /> : (`;
    },
  );

  next = next.replace(
    /<div className="loading-inline">([^<]*)<\/div>/g,
    (_, msg) => {
      const message = msg.trim();
      const variant = pickVariant(message, 'inline');
      return `<LoadingState variant="${variant}" message="${message}" />`;
    },
  );

  if (next.includes('LoadingState') && !next.includes(IMPORT)) {
    const lines = next.split('\n');
    const firstImportIdx = lines.findIndex((l) => l.startsWith('import '));
    const insertAt = firstImportIdx >= 0 ? firstImportIdx + 1 : 0;
    lines.splice(insertAt, 0, IMPORT);
    next = lines.join('\n');
  }

  // Fix accidental insertion inside multi-line imports
  next = next.replace(
    /import \{\nimport \{ LoadingState \} from '\.\.\/components\/ux\/LoadingState';\n/g,
    `${IMPORT}\nimport {\n`,
  );

  return next === content ? null : next;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const original = readFileSync(file, 'utf8');
  const updated = migrate(original);
  if (updated) {
    writeFileSync(file, updated);
    changed += 1;
    console.log('Updated', relative(join(import.meta.dirname, '..'), file));
  }
}

console.log(`Done. ${changed} file(s) updated.`);
