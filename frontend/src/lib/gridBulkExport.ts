/**
 * PM-04 — Exportación masiva client-side para filas seleccionadas.
 */

import type { GridColumnDef } from './data-grid/types';
import { getCellValue } from './data-grid/types';

function getExportValueSafe<T>(row: T, col: GridColumnDef<T>): string {
  if (col.getExportValue) return String(col.getExportValue(row));
  if (col.getValue) {
    const v = col.getValue(row);
    return v == null ? '' : String(v);
  }
  return getCellValue(row, col).replace(/"/g, '""');
}

export function exportRowsToCsv<T>(
  rows: T[],
  columns: GridColumnDef<T>[],
  filename: string,
): void {
  const exportCols = columns.filter((c) => c.key !== 'actions');
  const header = exportCols.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const lines = rows.map((row) =>
    exportCols.map((col) => `"${getExportValueSafe(row, col)}"`).join(','),
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
