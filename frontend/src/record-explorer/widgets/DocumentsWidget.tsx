import { WidgetShell } from '../components/WidgetShell';
import type { UreDocument } from '../types';

interface DocumentsWidgetProps {
  documents: UreDocument[];
}

export function DocumentsWidget({ documents }: DocumentsWidgetProps) {
  return (
    <WidgetShell title="Documentos" id="ure-documents" empty={documents.length === 0}>
      <ul className="ure-doc-list">
        {documents.map((doc) => (
          <li key={doc.id}>
            <strong>{doc.title ?? doc.documentTypeCode ?? 'Documento'}</strong>
            <span className="ure-doc-meta">
              {[doc.mediaType, doc.createdAt?.slice(0, 10)].filter(Boolean).join(' · ')}
            </span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
