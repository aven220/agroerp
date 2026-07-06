import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEihErrors, resolveEihError, retryEihError, type EihSyncError } from '../api/integration';

export function IntegrationErrorsPage() {
  const [errors, setErrors] = useState<EihSyncError[]>([]);
  const reload = () => listEihErrors().then(setErrors);
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Cola de errores"
        subtitle="Reintentos y reprocesamiento"
        actions={<Link to="/integraciones" className="btn">Centro</Link>}
      />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Estado</th><th>Mensaje</th><th>Reintentos</th><th></th></tr></thead>
          <tbody>
            {errors.map((e) => (
              <tr key={e.id}>
                <td>{e.errorKey}</td>
                <td>{e.status}</td>
                <td>{e.message}</td>
                <td>{e.retryCount}</td>
                <td>
                  <button type="button" className="btn btn-sm" onClick={() => retryEihError(e.id).then(reload)}>Reintentar</button>
                  <button type="button" className="btn btn-sm" onClick={() => resolveEihError(e.id).then(reload)}>Resolver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
