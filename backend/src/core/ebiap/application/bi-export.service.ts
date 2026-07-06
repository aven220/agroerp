import { BadRequestException, Injectable } from '@nestjs/common';
import { BiReportFormat } from '@agroerp/shared';

@Injectable()
export class BiExportService {
  export(
    rows: Record<string, unknown>[],
    columns: Array<{ key: string; label: string }>,
    format: BiReportFormat,
    title = 'Reporte',
  ) {
    const cols = columns.length
      ? columns
      : Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));

    switch (format) {
      case 'csv':
        return { format, mimeType: 'text/csv', content: this.toCsv(rows, cols) };
      case 'json':
        return { format, mimeType: 'application/json', content: JSON.stringify(rows, null, 2) };
      case 'xml':
        return { format, mimeType: 'application/xml', content: this.toXml(rows, cols, title) };
      case 'excel':
        return { format, mimeType: 'application/vnd.ms-excel', content: this.toSpreadsheetMl(rows, cols, title) };
      case 'ods':
        return { format, mimeType: 'application/vnd.oasis.opendocument.spreadsheet', content: this.toOds(rows, cols, title) };
      case 'pdf':
        return { format, mimeType: 'text/html', content: this.toPrintableHtml(rows, cols, title) };
      default:
        throw new BadRequestException(`Formato no soportado: ${format}`);
    }
  }

  private toCsv(rows: Record<string, unknown>[], cols: Array<{ key: string; label: string }>) {
    const header = cols.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const lines = rows.map((row) =>
      cols
        .map((c) => {
          const v = row[c.key];
          const s = v === null || v === undefined ? '' : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(','),
    );
    return [header, ...lines].join('\n');
  }

  private toXml(rows: Record<string, unknown>[], cols: Array<{ key: string; label: string }>, title: string) {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const body = rows
      .map(
        (row) =>
          `  <row>${cols.map((c) => `<${c.key}>${esc(String(row[c.key] ?? ''))}</${c.key}>`).join('')}</row>`,
      )
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<report title="${esc(title)}">\n${body}\n</report>`;
  }

  private toSpreadsheetMl(rows: Record<string, unknown>[], cols: Array<{ key: string; label: string }>, title: string) {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const headerCells = cols.map((c) => `<Cell><Data ss:Type="String">${esc(c.label)}</Data></Cell>`).join('');
    const dataRows = rows
      .map((row) => {
        const cells = cols
          .map((c) => {
            const v = row[c.key];
            const type = typeof v === 'number' ? 'Number' : 'String';
            return `<Cell><Data ss:Type="${type}">${esc(String(v ?? ''))}</Data></Cell>`;
          })
          .join('');
        return `<Row>${cells}</Row>`;
      })
      .join('');
    return `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n<Worksheet ss:Name="${esc(title.slice(0, 31))}"><Table>\n<Row>${headerCells}</Row>\n${dataRows}\n</Table></Worksheet>\n</Workbook>`;
  }

  private toOds(rows: Record<string, unknown>[], cols: Array<{ key: string; label: string }>, title: string) {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const header = cols.map((c) => `<table:table-cell><text:p>${esc(c.label)}</text:p></table:table-cell>`).join('');
    const dataRows = rows
      .map((row) => {
        const cells = cols
          .map((c) => `<table:table-cell><text:p>${esc(String(row[c.key] ?? ''))}</text:p></table:table-cell>`)
          .join('');
        return `<table:table-row>${cells}</table:table-row>`;
      })
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">\n<office:body><office:spreadsheet><table:table table:name="${esc(title)}"><table:table-row>${header}</table:table-row>${dataRows}</table:table></office:spreadsheet></office:body>\n</office:document-content>`;
  }

  private toPrintableHtml(rows: Record<string, unknown>[], cols: Array<{ key: string; label: string }>, title: string) {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const th = cols.map((c) => `<th>${esc(c.label)}</th>`).join('');
    const trs = rows
      .map((row) => `<tr>${cols.map((c) => `<td>${esc(String(row[c.key] ?? ''))}</td>`).join('')}</tr>`)
      .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Segoe UI,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#1b5e3b;color:#fff}</style></head><body><h1>${esc(title)}</h1><table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
  }
}
