/**
 * PM-04 — Acciones masivas reutilizables (solo frontend).
 */

import type { BulkAction, GridColumnDef } from './data-grid/types';
import { copyTextToClipboard, exportRowsToCsv } from './gridBulkExport';

export function createBulkExportAction<T extends { id: string }>(
  columns: GridColumnDef<T>[],
  filenamePrefix: string,
): BulkAction<T> {
  return {
    id: 'bulk-export',
    label: 'Exportar selección',
    icon: '📥',
    onAction: (rows) => {
      if (!rows.length) return;
      const date = new Date().toISOString().slice(0, 10);
      exportRowsToCsv(rows, columns, `${filenamePrefix}-${date}.csv`);
    },
  };
}

export function createBulkCopyIdsAction<T extends { id: string }>(): BulkAction<T> {
  return {
    id: 'bulk-copy-ids',
    label: 'Copiar IDs',
    icon: '📋',
    onAction: async (rows) => {
      if (!rows.length) return;
      await copyTextToClipboard(rows.map((r) => r.id).join('\n'));
    },
  };
}

export function createBulkNavigateAction<T extends { id: string }>(
  label: string,
  buildPath: (row: T) => string,
  icon = '↗',
): BulkAction<T> {
  return {
    id: 'bulk-open-first',
    label,
    icon,
    onAction: (rows) => {
      if (!rows[0]) return;
      window.open(buildPath(rows[0]), '_blank', 'noopener');
    },
  };
}

export function createStandardBulkActions<T extends { id: string }>(
  columns: GridColumnDef<T>[],
  filenamePrefix: string,
  buildPath?: (row: T) => string,
): BulkAction<T>[] {
  const actions: BulkAction<T>[] = [
    createBulkExportAction(columns, filenamePrefix),
    createBulkCopyIdsAction<T>(),
  ];
  if (buildPath) {
    actions.push(createBulkNavigateAction('Abrir primero', buildPath));
  }
  return actions;
}
