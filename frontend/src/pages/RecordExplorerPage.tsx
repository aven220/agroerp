import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { UniversalRecordExplorer } from '../record-explorer/components/UniversalRecordExplorer';

export function RecordExplorerPage() {
  const { entityType, recordId } = useParams<{ entityType: string; recordId: string }>();

  if (!entityType || !recordId) {
    return <div className="alert alert-error">Ruta inválida</div>;
  }

  return (
    <>
      <Header
        title="Record Explorer"
        subtitle={`${entityType} · ${recordId}`}
        actions={
          <Link to="/" className="btn btn-secondary">
            Inicio
          </Link>
        }
      />
      <UniversalRecordExplorer entityType={entityType} recordId={recordId} />
    </>
  );
}
