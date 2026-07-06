import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listQualityPhotos } from '../api/coffee';

export function CoffeeQualityPhotosPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    listQualityPhotos().then((r) => setRows(r as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header
        title="Fotografías de calidad"
        subtitle="Evidencia visual de muestras"
        actions={<Link to="/compras/calidad" className="btn">Panel calidad</Link>}
      />
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr><th>Ticket</th><th>Productor</th><th>Clave</th><th>Tipo</th><th>URL</th><th>Caption</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const ticket = r.ticket as Record<string, unknown> | undefined;
              return (
                <tr key={i}>
                  <td>{String(ticket?.ticketKey ?? '')}</td>
                  <td>{String(ticket?.producerName ?? '')}</td>
                  <td>{String(r.photoKey)}</td>
                  <td>{String(r.photoType)}</td>
                  <td>{String(r.storageUrl ?? '—')}</td>
                  <td>{String(r.caption ?? '—')}</td>
                  <td>{r.createdAt ? new Date(String(r.createdAt)).toLocaleString() : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
