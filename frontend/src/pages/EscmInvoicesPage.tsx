import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEscmInvoice, issueEscmInvoice, listEscmInvoices, voidEscmInvoice } from '../api/escm';

export function EscmInvoicesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState('');
  const reload = () => listEscmInvoices(status ? { status } : undefined).then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, [status]);

  return (
    <>
      <Header
        title="Gestor de facturas"
        subtitle="Nacionales, internacionales, parciales y consolidadas"
        actions={<Link to="/comercial/facturacion" className="btn">Centro facturación</Link>}
      />
      <section className="panel">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="draft">Borrador</option>
          <option value="proforma">Prefactura</option>
          <option value="issued">Emitida</option>
          <option value="partial">Parcial</option>
          <option value="voided">Anulada</option>
        </select>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Factura</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.invoiceKey)}>
                <td><Link to={`/comercial/facturas/${r.invoiceKey}`}>{String(r.invoiceKey)}</Link></td>
                <td>{String(r.customerKey)}</td>
                <td>{String(r.invoiceType)}</td>
                <td>{String(r.status)}</td>
                <td>{Number(r.totalAmount).toLocaleString()}</td>
                <td className="row-actions">
                  {(r.status === 'draft' || r.status === 'proforma') && (
                    <button className="btn btn-sm" onClick={() => issueEscmInvoice(String(r.invoiceKey)).then(reload)}>Emitir</button>
                  )}
                  {(r.status === 'issued' || r.status === 'partial' || r.status === 'proforma') && (
                    <button className="btn btn-sm" onClick={() => voidEscmInvoice(String(r.invoiceKey), 'Anulación operativa').then(reload)}>Anular</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function EscmInvoiceDetailPage() {
  const { invoiceKey = '' } = useParams();
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (invoiceKey) getEscmInvoice(invoiceKey).then(setRow);
  }, [invoiceKey]);
  const lines = (row?.lines ?? []) as Array<Record<string, unknown>>;
  return (
    <>
      <Header title={`Factura ${invoiceKey}`} subtitle={String(row?.status ?? '')} actions={<Link to="/comercial/facturas" className="btn">Volver</Link>} />
      <section className="panel">
        <div>Cliente: {String(row?.customerKey)}</div>
        <div>Total: {Number(row?.totalAmount ?? 0).toLocaleString()}</div>
        <div>IVA: {Number(row?.taxAmount ?? 0).toLocaleString()}</div>
        <div>Retenciones: {Number(row?.withholdingAmount ?? 0).toLocaleString()}</div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Ítem</th><th>Cant.</th><th>Precio</th><th>IVA</th><th>Total</th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={String(l.lineKey)}>
                <td>{String(l.itemKey)}</td>
                <td>{Number(l.quantity)}</td>
                <td>{Number(l.unitPrice).toLocaleString()}</td>
                <td>{Number(l.taxAmount).toLocaleString()}</td>
                <td>{Number(l.lineTotal).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
