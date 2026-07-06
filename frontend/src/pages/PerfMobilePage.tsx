import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEpopMobileSummary } from '../api/performance';

export function PerfMobilePage() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getEpopMobileSummary().then((s) => setSummary(s as unknown as Record<string, unknown>)); }, []);

  return (
    <>
      <Header title="Optimización Android" subtitle="Startup, memoria, batería, FPS, sync, offline" actions={<Link to="/rendimiento" className="btn">Centro</Link>} />
      <section className="panel">
        <pre className="code-block">{JSON.stringify(summary, null, 2)}</pre>
      </section>
    </>
  );
}
