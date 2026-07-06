import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getQualitySample, listQualitySamples, updateSampleCustody } from '../api/coffee';

export function CoffeeQualitySamplesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const reload = () => listQualitySamples().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Muestras y custodia"
        subtitle="Código único, ubicación, estado e historial"
        actions={<Link to="/compras/calidad" className="btn">Panel calidad</Link>}
      />
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Muestra</th>
              <th>Custodia</th>
              <th>Ticket</th>
              <th>Estado</th>
              <th>Ubicación</th>
              <th>Reanálisis</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ticket = r.ticket as Record<string, unknown> | undefined;
              return (
                <tr key={String(r.id ?? r.sampleKey)}>
                  <td>{String(r.sampleKey)}</td>
                  <td>{String(r.custodyCode ?? '—')}</td>
                  <td>{String(ticket?.ticketKey ?? '')}</td>
                  <td>{String(r.status)}</td>
                  <td>{String(r.physicalLocation ?? '—')}</td>
                  <td>{String(r.reanalysisCount ?? 0)}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn" onClick={() => getQualitySample(String(r.sampleKey)).then(setDetail)}>
                      Historial
                    </button>
                    <button
                      className="btn"
                      onClick={() =>
                        updateSampleCustody(String(r.sampleKey), {
                          status: 'reanalysis',
                          notes: 'Reanálisis solicitado',
                        }).then(reload)
                      }
                    >
                      Reanálisis
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {detail ? (
        <section className="panel">
          <h3>Custodia {String(detail.sampleKey)}</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(detail, null, 2)}</pre>
        </section>
      ) : null}
    </>
  );
}
