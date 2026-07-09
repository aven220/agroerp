import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { labelEntityType } from '../lib/userLabels';
import { UniversalRecordExplorer } from '../record-explorer/components/UniversalRecordExplorer';

export function RecordExplorerPage() {
  const { entityType, recordId } = useParams<{ entityType: string; recordId: string }>();

  if (!entityType || !recordId) {
    return <div className="alert alert-error">No se pudo abrir el expediente. Verifique el enlace.</div>;
  }

  const entityLabel = labelEntityType(entityType);

  return (
    <>
      <Header
        title="Expediente 360°"
        subtitle={`Vista completa del ${entityLabel.toLowerCase()} — historial, documentos y análisis en un solo lugar`}
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
