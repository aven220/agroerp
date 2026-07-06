import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEscmBillingHistory, issueEscmCreditNote, listEscmCreditNotes, listEscmDebitNotes } from '../api/escm';

export function EscmNotesPage() {
  const [creditNotes, setCreditNotes] = useState<Array<Record<string, unknown>>>([]);
  const [debitNotes, setDebitNotes] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => {
    listEscmCreditNotes().then((r) => setCreditNotes(r as Array<Record<string, unknown>>));
    listEscmDebitNotes().then((r) => setDebitNotes(r as Array<Record<string, unknown>>));
  };
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Gestor de notas" subtitle="Notas crédito, débito y ajustes comerciales" actions={<Link to="/comercial/facturacion" className="btn">Centro facturación</Link>} />
      <section className="panel">
        <h3>Notas crédito</h3>
        <table className="data-table">
          <thead><tr><th>Nota</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead>
          <tbody>
            {creditNotes.map((n) => (
              <tr key={String(n.creditNoteKey)}>
                <td>{String(n.creditNoteKey)}</td>
                <td>{String(n.customerKey)}</td>
                <td>{String(n.status)}</td>
                <td>{Number(n.totalAmount).toLocaleString()}</td>
                <td>
                  {n.status === 'draft' && (
                    <button className="btn btn-sm" onClick={() => issueEscmCreditNote(String(n.creditNoteKey)).then(reload)}>Emitir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Notas débito</h3>
        <table className="data-table">
          <thead><tr><th>Nota</th><th>Cliente</th><th>Estado</th><th>Total</th></tr></thead>
          <tbody>
            {debitNotes.map((n) => (
              <tr key={String(n.debitNoteKey)}>
                <td>{String(n.debitNoteKey)}</td>
                <td>{String(n.customerKey)}</td>
                <td>{String(n.status)}</td>
                <td>{Number(n.totalAmount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EscmBillingDocumentsPage() {
  const [history, setHistory] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getEscmBillingHistory().then(setHistory);
  }, []);
  const docs = (history?.billingDocuments ?? []) as Array<Record<string, unknown>>;
  return (
    <>
      <Header title="Consulta de documentos" subtitle="Historial fiscal y comercial" actions={<Link to="/comercial/facturacion" className="btn">Centro facturación</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Documento</th><th>Tipo</th><th>Referencia</th><th>Cliente</th><th>Fecha</th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={String(d.documentKey)}>
                <td>{String(d.documentKey)}</td>
                <td>{String(d.documentType)}</td>
                <td>{String(d.referenceKey)}</td>
                <td>{String(d.customerKey ?? '—')}</td>
                <td>{String(d.generatedAt ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
