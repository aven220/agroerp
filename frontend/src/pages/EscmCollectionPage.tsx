import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { activateEscmCampaign, createEscmCampaign, listEscmCollectionActivities, runEscmAutoReminders } from '../api/escm';

export function EscmCollectionPage() {
  const [campaigns, setCampaigns] = useState<Array<Record<string, unknown>>>([]);
  const [activities, setActivities] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => {
    listEscmCollectionActivities().then((r) => setActivities(r as Array<Record<string, unknown>>));
  };
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Panel de cobranza" subtitle="Campañas, recordatorios y escalamiento" actions={<Link to="/comercial/cartera-centro" className="btn">Centro cartera</Link>} />
      <section className="panel">
        <button className="btn" onClick={() => createEscmCampaign({ name: 'Campaña mora 30+', channel: 'email', targetCriteria: { minDaysPastDue: 30 } }).then((c) => activateEscmCampaign(String((c as Record<string, unknown>).campaignKey))).then(reload)}>Lanzar campaña mora</button>
        <button className="btn" style={{ marginLeft: 8 }} onClick={() => runEscmAutoReminders().then(reload)}>Recordatorios automáticos</button>
      </section>
      <section className="panel">
        <h3>Actividades recientes</h3>
        <table className="data-table">
          <thead><tr><th>Actividad</th><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Canal</th></tr></thead>
          <tbody>
            {activities.map((a) => (
              <tr key={String(a.activityKey)}>
                <td>{String(a.activityKey)}</td>
                <td>{String(a.customerKey)}</td>
                <td>{String(a.activityType)}</td>
                <td>{String(a.status)}</td>
                <td>{String(a.channel ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EscmAgreementsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/escm').then((m) => m.listEscmAgreements().then((r) => setRows(r as Array<Record<string, unknown>>)));
  }, []);

  return (
    <>
      <Header title="Gestor de acuerdos de pago" subtitle="Acuerdos, cuotas y cumplimiento" actions={<Link to="/comercial/cartera-centro" className="btn">Centro cartera</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Acuerdo</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Pagado</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.agreementKey)}>
                <td>{String(r.agreementKey)}</td>
                <td>{String(r.customerKey)}</td>
                <td>{String(r.status)}</td>
                <td>{Number(r.totalAmount).toLocaleString()}</td>
                <td>{Number(r.paidAmount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EscmStatementsPage() {
  const [docs, setDocs] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/escm').then((m) => m.listEscmArDocuments({ documentType: 'statement' }).then((r) => setDocs(r as Array<Record<string, unknown>>)));
  }, []);

  return (
    <>
      <Header title="Estados de cuenta" subtitle="Historial, vencidas y proyección" actions={<Link to="/comercial/cartera-centro" className="btn">Centro cartera</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Documento</th><th>Cliente</th><th>Tipo</th><th>Generado</th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={String(d.documentKey)}>
                <td>{String(d.documentKey)}</td>
                <td>{String(d.customerKey)}</td>
                <td>{String(d.documentType)}</td>
                <td>{String(d.generatedAt).slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
