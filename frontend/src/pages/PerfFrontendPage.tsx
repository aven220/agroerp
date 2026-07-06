import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEpopBundleSummary } from '../api/performance';

export function PerfFrontendPage() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEpopBundleSummary().then((s) => setSummary(s as unknown as Record<string, unknown>)); }, []);

  return (
    <>
      <Header title="Optimización Frontend" subtitle="Bundle splitting, code splitting, CDN ready" actions={<Link to="/rendimiento" className="btn">Centro</Link>} />
      <section className="panel">
        <h3>Bundles</h3>
        <pre className="code-block">{JSON.stringify(summary, null, 2)}</pre>
      </section>
      <section className="panel">
        <h3>Técnicas activas</h3>
        <ul>
          <li>Code splitting por página (Vite manualChunks)</li>
          <li>Vendor chunks (react / maps)</li>
          <li>Virtualización de listas (VirtualList)</li>
          <li>Lazy loading de rutas pesadas</li>
          <li>CSS code split</li>
          <li>CDN ready assets</li>
        </ul>
      </section>
    </>
  );
}
