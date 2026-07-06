import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapBpms,
  computeBpmsMonitoring,
  getBpmsCenter,
  getBpmsDiagram,
  getBpmsInbox,
  getBpmsMonitoring,
  getBpmsProcess,
  listBpmsAutomations,
  listBpmsInstances,
  listBpmsProcesses,
  listBpmsTemplates,
  publishBpmsVersion,
  saveBpmsDiagram,
  validateBpmsDiagram,
} from '../api/bpms';

const BPMS_LINKS = (
  <div className="row-actions">
    <Link to="/bpms" className="btn">Centro</Link>
    <Link to="/bpms/disenador" className="btn">Diseñador</Link>
    <Link to="/bpms/automatizaciones" className="btn">Automatizaciones</Link>
    <Link to="/bpms/procesos" className="btn">Procesos</Link>
    <Link to="/bpms/monitoreo" className="btn">Monitoreo</Link>
    <Link to="/bpms/ejecutivo" className="btn">Ejecutivo</Link>
    <Link to="/bpms/plantillas" className="btn">Plantillas</Link>
  </div>
);

export function BpmsCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getBpmsCenter().then(setCenter); }, []);
  const dashboard = center?.dashboard as Record<string, unknown> | undefined;
  const indicators = dashboard?.indicators as Record<string, number> | undefined;

  return (
    <>
      <Header title="Centro BPMS" subtitle="Motor de procesos empresariales" actions={BPMS_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Procesos</span><span className="kpi-value">{((center?.processes as unknown[]) ?? []).length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Instancias activas</span><span className="kpi-value">{((center?.instances as unknown[]) ?? []).length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Bandeja</span><span className="kpi-value">{((center?.inbox as unknown[]) ?? []).length}</span></div>
        <div className="kpi-card"><span className="kpi-label">SLA</span><span className="kpi-value">{String(indicators?.slaCompliancePct ?? '—')}%</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapBpms().then(() => getBpmsCenter().then(setCenter))}>Inicializar BPMS</button>
      </section>
    </>
  );
}

type DiagramElement = { elementKey: string; elementType: string; name: string; posX: number; posY: number };

export function BpmsDesignerPage() {
  const [processKey, setProcessKey] = useState('PROC-APPROVAL');
  const [versionKey, setVersionKey] = useState('');
  const [elements, setElements] = useState<DiagramElement[]>([]);
  const [flows, setFlows] = useState<Array<{ fromElementKey: string; toElementKey: string }>>([]);
  const [validation, setValidation] = useState<Record<string, unknown> | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);

  useEffect(() => {
    getBpmsProcess(processKey).then((p) => {
      const ver = (p.versions as Array<{ versionKey: string }>)?.[0];
      if (ver) {
        setVersionKey(ver.versionKey);
        getBpmsDiagram(ver.versionKey).then((d) => {
          setElements((d.elements as DiagramElement[]) ?? []);
          setFlows(((d.flows as Array<{ fromElementKey: string; toElementKey: string }>) ?? []).map((f) => ({ fromElementKey: f.fromElementKey, toElementKey: f.toElementKey })));
        });
      }
    });
  }, [processKey]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragKey) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setElements((prev) => prev.map((el) => el.elementKey === dragKey ? { ...el, posX: e.clientX - rect.left - 60, posY: e.clientY - rect.top - 20 } : el));
  }, [dragKey]);

  function addElement(type: string, name: string) {
    const key = `${type}_${elements.length + 1}`;
    setElements((prev) => [...prev, { elementKey: key, elementType: type, name, posX: 100 + prev.length * 30, posY: 100 }]);
  }

  function save() {
    if (!versionKey) return;
    saveBpmsDiagram(versionKey, elements, flows).then(() => validateBpmsDiagram(versionKey).then(setValidation));
  }

  return (
    <>
      <Header title="Diseñador Visual" subtitle="Drag & Drop BPMN" actions={BPMS_LINKS} />
      <section className="card row-actions">
        <button className="btn" onClick={() => addElement('start', 'Inicio')}>+ Inicio</button>
        <button className="btn" onClick={() => addElement('user_task', 'Tarea')}>+ Tarea humana</button>
        <button className="btn" onClick={() => addElement('service_task', 'Servicio')}>+ Tarea automática</button>
        <button className="btn" onClick={() => addElement('exclusive_gateway', 'Decisión')}>+ Compuerta</button>
        <button className="btn" onClick={() => addElement('timer', 'Timer')}>+ Temporizador</button>
        <button className="btn" onClick={() => addElement('end', 'Fin')}>+ Fin</button>
        <button className="btn btn-primary" onClick={save}>Guardar</button>
        <button className="btn" onClick={() => versionKey && publishBpmsVersion(versionKey)}>Publicar</button>
      </section>
      <div className="card" style={{ position: 'relative', minHeight: 420, background: '#f8fafc' }} onMouseMove={onMouseMove} onMouseUp={() => setDragKey(null)}>
        {elements.map((el) => (
          <div
            key={el.elementKey}
            onMouseDown={() => setDragKey(el.elementKey)}
            style={{ position: 'absolute', left: el.posX, top: el.posY, padding: '8px 12px', background: '#fff', border: '2px solid #334155', borderRadius: 6, cursor: 'move', minWidth: 100 }}
          >
            <strong>{el.name}</strong>
            <div className="text-muted" style={{ fontSize: 11 }}>{el.elementType}</div>
          </div>
        ))}
      </div>
      {validation && <section className="card"><pre>{JSON.stringify(validation, null, 2)}</pre></section>}
    </>
  );
}

export function BpmsAutomationCenterPage() {
  const [items, setItems] = useState<unknown[]>([]);
  useEffect(() => { listBpmsAutomations().then(setItems); }, []);
  return (
    <>
      <Header title="Centro de Automatizaciones" actions={BPMS_LINKS} />
      <section className="card">
        <ul>{items.map((a, i) => {
          const row = a as { name: string; automationType: string; isActive: boolean };
          return <li key={i}>{row.name} — {row.automationType} {row.isActive ? '(activa)' : ''}</li>;
        })}</ul>
      </section>
    </>
  );
}

export function BpmsProcessCenterPage() {
  const [processes, setProcesses] = useState<unknown[]>([]);
  const [instances, setInstances] = useState<unknown[]>([]);
  useEffect(() => {
    listBpmsProcesses().then(setProcesses);
    listBpmsInstances().then(setInstances);
  }, []);
  return (
    <>
      <Header title="Centro de Procesos" actions={BPMS_LINKS} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Definiciones</span><span className="kpi-value">{processes.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Instancias</span><span className="kpi-value">{instances.length}</span></div>
      </div>
      <section className="card">
        <h3>Procesos</h3>
        <ul>{processes.map((p, i) => {
          const row = p as { processKey: string; name: string; status: string };
          return <li key={i}>{row.processKey}: {row.name} ({row.status})</li>;
        })}</ul>
      </section>
    </>
  );
}

export function BpmsMonitoringPage() {
  const [mon, setMon] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getBpmsMonitoring().then(setMon); }, []);
  const indicators = mon?.indicators as Record<string, number> | undefined;
  return (
    <>
      <Header title="Panel de Monitoreo" actions={BPMS_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Activos</span><span className="kpi-value">{String(indicators?.activeInstances ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Finalizados</span><span className="kpi-value">{String(indicators?.completedInstances ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Fallidos</span><span className="kpi-value">{String(indicators?.failedInstances ?? 0)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Duración prom.</span><span className="kpi-value">{String(indicators?.avgDurationHours ?? '—')} h</span></div>
      </div>
      <section className="card">
        <button className="btn" onClick={() => computeBpmsMonitoring().then(() => getBpmsMonitoring().then(setMon))}>Recalcular</button>
      </section>
    </>
  );
}

export function BpmsExecutiveDashboardPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [inbox, setInbox] = useState<unknown[]>([]);
  useEffect(() => {
    getBpmsCenter().then(setCenter);
    getBpmsInbox().then(setInbox);
  }, []);
  const dashboard = center?.dashboard as Record<string, unknown> | undefined;
  const indicators = dashboard?.indicators as Record<string, number> | undefined;
  return (
    <>
      <Header title="Dashboard Ejecutivo BPMS" actions={BPMS_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Throughput</span><span className="kpi-value">{String(indicators?.throughputPct ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">SLA</span><span className="kpi-value">{String(indicators?.slaCompliancePct ?? '—')}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Tareas pendientes</span><span className="kpi-value">{inbox.length}</span></div>
        <div className="kpi-card"><span className="kpi-label">Automatizaciones</span><span className="kpi-value">{((center?.automations as unknown[]) ?? []).length}</span></div>
      </div>
    </>
  );
}

export function BpmsTemplateRepositoryPage() {
  const [templates, setTemplates] = useState<unknown[]>([]);
  useEffect(() => { listBpmsTemplates().then(setTemplates); }, []);
  return (
    <>
      <Header title="Repositorio de Plantillas" actions={BPMS_LINKS} />
      <section className="card">
        <ul>{templates.map((t, i) => {
          const row = t as { templateKey: string; name: string; category: string };
          return <li key={i}>{row.templateKey}: {row.name} [{row.category}]</li>;
        })}</ul>
      </section>
    </>
  );
}

export function BpmsInboxPage() {
  const [tasks, setTasks] = useState<unknown[]>([]);
  useEffect(() => { getBpmsInbox().then(setTasks); }, []);
  return (
    <>
      <Header title="Bandeja de Tareas BPMS" actions={BPMS_LINKS} />
      <section className="card">
        <ul>{tasks.map((t, i) => {
          const row = t as { taskKey: string; title: string; priority: string; status: string };
          return <li key={i}>{row.title} — {row.priority} ({row.status})</li>;
        })}</ul>
      </section>
    </>
  );
}
