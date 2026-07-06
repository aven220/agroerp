import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  approveEscmQuotation,
  convertEscmQuotation,
  getEscmQuotation,
  getEscmQuotationVersions,
  rejectEscmQuotation,
  versionEscmQuotation,
} from '../api/escm';

export function EscmQuotationDetailPage() {
  const { quotationKey = '' } = useParams();
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [versions, setVersions] = useState<Array<Record<string, unknown>>>([]);
  const [convertResult, setConvertResult] = useState<Record<string, unknown> | null>(null);

  const reload = () => {
    if (!quotationKey) return;
    getEscmQuotation(quotationKey).then((q) => {
      setQuote(q);
      if (q.quoteGroupKey) getEscmQuotationVersions(String(q.quoteGroupKey)).then((v) => setVersions(v as Array<Record<string, unknown>>));
    });
  };
  useEffect(() => { reload(); }, [quotationKey]);

  return (
    <>
      <Header
        title={`Cotización ${quotationKey}`}
        subtitle={quote ? `${String(quote.status)} · v${String(quote.version)}` : ''}
        actions={<Link to="/comercial/cotizaciones" className="btn">Centro cotizaciones</Link>}
      />
      {quote ? (
        <>
          <section className="panel">
            <div className="kpi-grid">
              <div className="kpi-card"><span className="kpi-label">Subtotal</span><span className="kpi-value">{Number(quote.subtotal ?? 0).toLocaleString()}</span></div>
              <div className="kpi-card"><span className="kpi-label">Impuestos</span><span className="kpi-value">{Number(quote.taxAmount ?? 0).toLocaleString()}</span></div>
              <div className="kpi-card kpi-card-primary"><span className="kpi-label">Total</span><span className="kpi-value">{Number(quote.totalAmount ?? 0).toLocaleString()}</span></div>
            </div>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => versionEscmQuotation(quotationKey).then(reload)}>Nueva versión</button>
              <button className="btn" onClick={() => approveEscmQuotation(quotationKey, 'offline://signature').then(reload)}>Aprobar con firma</button>
              <button className="btn" onClick={() => rejectEscmQuotation(quotationKey, 'Rechazada').then(reload)}>Rechazar</button>
              <button className="btn" onClick={() => convertEscmQuotation(quotationKey).then(setConvertResult)}>Convertir a pedido</button>
            </div>
          </section>
          <section className="panel">
            <h3>Líneas</h3>
            <table className="data-table">
              <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Impuesto</th><th>Total</th></tr></thead>
              <tbody>
                {((quote.lines as Array<Record<string, unknown>>) ?? []).map((l) => (
                  <tr key={String(l.lineKey)}>
                    <td>{String(l.itemKey)}</td>
                    <td>{String(l.quantity)}</td>
                    <td>{Number(l.unitPrice).toLocaleString()}</td>
                    <td>{String(l.taxKey ?? '—')}</td>
                    <td>{Number(l.lineTotal).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h3>Versiones ({versions.length})</h3>
            <ul>
              {versions.map((v) => (
                <li key={String(v.quotationKey)}>
                  <Link to={`/comercial/cotizaciones/${encodeURIComponent(String(v.quotationKey))}`}>
                    v{String(v.version)} — {String(v.status)} — {Number(v.totalAmount ?? 0).toLocaleString()}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {convertResult ? (
            <section className="panel">
              <h3>Pedido generado</h3>
              <pre>{JSON.stringify(convertResult, null, 2)}</pre>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
