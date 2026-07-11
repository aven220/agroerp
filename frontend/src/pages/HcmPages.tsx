import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { LoadingState } from '../components/ux/LoadingState';

export function HcmCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/hcm').then(({ getHcmCenter }) => getHcmCenter().then(setCenter));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Centro de recursos humanos"
        subtitle="Empleados, organización y expedientes"
        actions={
          <div className="row-actions">
            <button className="btn" onClick={() => import('../api/hcm').then(({ seedHcm }) => seedHcm().then(reload))}>Cargar configuración inicial</button>
            <Link to="/rrhh/organizacion" className="btn">Organización</Link>
            <Link to="/rrhh/empleados" className="btn">Empleados</Link>
            <Link to="/rrhh/organigrama" className="btn">Organigrama</Link>
            <Link to="/rrhh/buscar" className="btn">Buscador</Link>
            <Link to="/rrhh/contratos" className="btn">Contratos</Link>
            <Link to="/rrhh/auditoria" className="btn">Auditoría</Link>
            <Link to="/rrhh/reclutamiento" className="btn">Reclutamiento</Link>
            <Link to="/rrhh/asistencia" className="btn">Asistencia</Link>
            <Link to="/rrhh/nomina" className="btn">Nómina</Link>
            <Link to="/rrhh/talento" className="btn">Talento</Link>
            <Link to="/rrhh/sst" className="btn">SST</Link>
          </div>
        }
      />
      {center ? (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Colaboradores</span><span className="kpi-value">{String(center.employeeCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Activos</span><span className="kpi-value">{String(center.activeEmployees ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Empresas</span><span className="kpi-value">{String(center.companyCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Departamentos</span><span className="kpi-value">{String(center.departmentCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Cargos</span><span className="kpi-value">{String(center.positionCount ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Contratos activos</span><span className="kpi-value">{String(center.activeContracts ?? 0)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Documentos</span><span className="kpi-value">{String(center.documentCount ?? 0)}</span></div>
        </div>
      ) : null}
    </>
  );
}

export function HcmOrgPage() {
  const [hierarchy, setHierarchy] = useState<Record<string, unknown> | null>(null);
  const reload = () => import('../api/hcm').then(({ getHcmHierarchy }) => getHcmHierarchy().then(setHierarchy as never));
  useEffect(() => { reload(); }, []);

  const companies = (hierarchy?.companies ?? []) as Array<Record<string, unknown>>;
  const branches = (hierarchy?.branches ?? []) as Array<Record<string, unknown>>;
  const departments = (hierarchy?.departments ?? []) as Array<Record<string, unknown>>;
  const positions = (hierarchy?.positions ?? []) as Array<Record<string, unknown>>;
  const workCenters = (hierarchy?.workCenters ?? []) as Array<Record<string, unknown>>;
  const levels = (hierarchy?.levels ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Gestor organizacional" subtitle="Empresas, sucursales, áreas, departamentos y cargos" actions={
        <div className="row-actions">
          <button className="btn" onClick={() => import('../api/hcm').then(({ rebuildHcmOrgChart }) => rebuildHcmOrgChart().then(reload))}>Reconstruir organigrama</button>
          <Link to="/rrhh" className="btn">Personal</Link>
        </div>
      } />
      <section className="panel"><h3>Empresas ({companies.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>NIT</th></tr></thead>
          <tbody>{companies.map((c) => <tr key={String(c.companyKey)}><td>{String(c.code)}</td><td>{String(c.name)}</td><td>{String(c.taxId ?? '')}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Sucursales ({branches.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Ciudad</th></tr></thead>
          <tbody>{branches.map((b) => <tr key={String(b.branchKey)}><td>{String(b.code)}</td><td>{String(b.name)}</td><td>{String(b.city ?? '')}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Departamentos ({departments.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Centro costo</th></tr></thead>
          <tbody>{departments.map((d) => <tr key={String(d.departmentKey)}><td>{String(d.code)}</td><td>{String(d.name)}</td><td>{String(d.costCenterKey ?? '')}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Cargos ({positions.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Nivel</th></tr></thead>
          <tbody>{positions.map((p) => <tr key={String(p.positionKey)}><td>{String(p.code)}</td><td>{String(p.name)}</td><td>{String(p.hierarchyLevelKey ?? '')}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Centros de trabajo ({workCenters.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Centro costo</th></tr></thead>
          <tbody>{workCenters.map((w) => <tr key={String(w.workCenterKey)}><td>{String(w.code)}</td><td>{String(w.name)}</td><td>{String(w.costCenterKey ?? '')}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Niveles jerárquicos ({levels.length})</h3>
        <table className="data-table"><thead><tr><th>Código</th><th>Nombre</th><th>Rango</th></tr></thead>
          <tbody>{levels.map((l) => <tr key={String(l.levelKey)}><td>{String(l.code)}</td><td>{String(l.name)}</td><td>{String(l.rank)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmEmployeesPage() {
  const [employees, setEmployees] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm').then(({ listHcmEmployees }) => listHcmEmployees({ status: 'active' }).then((r) => setEmployees(r as Array<Record<string, unknown>>)));
  }, []);

  return (
    <>
      <Header title="Centro de empleados" subtitle="Expedientes y estado laboral" actions={<Link to="/rrhh" className="btn">Personal</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Número</th><th>Nombre</th><th>Documento</th><th>Departamento</th><th>Cargo</th><th>Estado</th><th>Expediente</th></tr></thead>
        <tbody>
          {employees.map((e) => (
            <tr key={String(e.employeeKey)}>
              <td>{String(e.employeeNumber)}</td>
              <td>{String(e.displayName)}</td>
              <td>{String(e.documentNumber)}</td>
              <td>{String(e.departmentKey ?? '')}</td>
              <td>{String(e.positionKey ?? '')}</td>
              <td>{String(e.employmentStatus)}</td>
              <td><Link to={`/rrhh/empleados/${encodeURIComponent(String(e.employeeKey))}`} className="btn btn-sm">Ver</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function HcmEmployeeFilePage({ employeeKey }: { employeeKey: string }) {
  const [employee, setEmployee] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/hcm').then(({ getHcmEmployee }) => getHcmEmployee(employeeKey).then(setEmployee as never));
  }, [employeeKey]);

  if (!employee) return <LoadingState variant="page" message="Cargando expediente..." />;

  const dependents = (employee.dependents ?? []) as Array<Record<string, unknown>>;
  const contacts = (employee.contacts ?? []) as Array<Record<string, unknown>>;
  const histories = (employee.histories ?? []) as Array<Record<string, unknown>>;
  const contracts = (employee.contracts ?? []) as Array<Record<string, unknown>>;
  const documents = (employee.documents ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title={String(employee.displayName)} subtitle={`Expediente ${String(employee.employeeNumber)}`} actions={<Link to="/rrhh/empleados" className="btn">Empleados</Link>} />
      <div className="kpi-grid">
        <div className="kpi-card"><span className="kpi-label">Estado</span><span className="kpi-value">{String(employee.employmentStatus)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Empresa</span><span className="kpi-value">{String(employee.companyKey)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Departamento</span><span className="kpi-value">{String(employee.departmentKey ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Ingreso</span><span className="kpi-value">{employee.hireDate ? String(employee.hireDate).slice(0, 10) : '—'}</span></div>
      </div>
      <section className="panel"><h3>Información personal</h3>
        <p>Email: {String(employee.email ?? '—')} · Tel: {String(employee.phone ?? employee.mobile ?? '—')}</p>
        <p>Documento: {String(employee.documentType)} {String(employee.documentNumber)}</p>
        <p>Dirección: {String(employee.address ?? '—')}, {String(employee.city ?? '')}</p>
      </section>
      <section className="panel"><h3>Dependientes ({dependents.length})</h3>
        <table className="data-table"><thead><tr><th>Nombre</th><th>Parentesco</th><th>Documento</th></tr></thead>
          <tbody>{dependents.map((d) => <tr key={String(d.dependentKey)}><td>{String(d.firstName)} {String(d.lastName)}</td><td>{String(d.relationship)}</td><td>{String(d.documentNumber ?? '')}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Contactos de emergencia ({contacts.length})</h3>
        <table className="data-table"><thead><tr><th>Nombre</th><th>Parentesco</th><th>Teléfono</th><th>Principal</th></tr></thead>
          <tbody>{contacts.map((c) => <tr key={String(c.contactKey)}><td>{String(c.name)}</td><td>{String(c.relationship)}</td><td>{String(c.phone)}</td><td>{c.isPrimary ? 'Sí' : 'No'}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Contratos ({contracts.length})</h3>
        <table className="data-table"><thead><tr><th>Contrato</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Estado</th></tr></thead>
          <tbody>{contracts.map((c) => <tr key={String(c.contractKey)}><td>{String(c.contractKey)}</td><td>{String(c.contractType)}</td><td>{String(c.startDate).slice(0, 10)}</td><td>{c.endDate ? String(c.endDate).slice(0, 10) : '—'}</td><td>{String(c.status)}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Documentos ({documents.length})</h3>
        <table className="data-table"><thead><tr><th>Título</th><th>Tipo</th><th>Versión</th><th>Vence</th></tr></thead>
          <tbody>{documents.map((d) => <tr key={String(d.documentKey)}><td>{String(d.title)}</td><td>{String(d.documentType)}</td><td>{String(d.currentVersion)}</td><td>{d.expiresAt ? String(d.expiresAt).slice(0, 10) : '—'}</td></tr>)}</tbody>
        </table>
      </section>
      <section className="panel"><h3>Historial laboral</h3>
        <table className="data-table"><thead><tr><th>Fecha</th><th>Evento</th><th>Notas</th></tr></thead>
          <tbody>{histories.map((h) => <tr key={String(h.historyKey)}><td>{String(h.effectiveDate).slice(0, 10)}</td><td>{String(h.eventType)}</td><td>{String(h.notes ?? '')}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

export function HcmOrgChartPage() {
  const [hierarchy, setHierarchy] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    import('../api/hcm').then(({ getHcmHierarchy }) => getHcmHierarchy().then(setHierarchy as never));
  }, []);

  const renderNode = (node: Record<string, unknown>, depth = 0) => (
    <div key={String(node.nodeKey)} style={{ marginLeft: depth * 24, padding: '4px 0' }}>
      <strong>{String(node.title)}</strong> <small>({String(node.nodeType)})</small>
      {((node.children ?? []) as Array<Record<string, unknown>>).map((child) => renderNode(child, depth + 1))}
    </div>
  );

  const orgChart = (hierarchy?.orgChart ?? []) as Array<Record<string, unknown>>;

  return (
    <>
      <Header title="Organigrama interactivo" subtitle="Jerarquía organizacional" actions={<Link to="/rrhh" className="btn">Personal</Link>} />
      <section className="panel">{orgChart.map((n) => renderNode(n))}</section>
    </>
  );
}

export function HcmSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);
  const search = () => {
    if (!query.trim()) return;
    import('../api/hcm').then(({ searchHcmEmployees }) => searchHcmEmployees(query).then((r) => setResults(r as Array<Record<string, unknown>>)));
  };

  return (
    <>
      <Header title="Buscador avanzado" subtitle="Empleados por nombre, documento o número" actions={<Link to="/rrhh" className="btn">Personal</Link>} />
      <section className="panel">
        <div className="row-actions">
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar colaborador..." />
          <button className="btn" onClick={search}>Buscar</button>
        </div>
        <table className="data-table">
          <thead><tr><th>Número</th><th>Nombre</th><th>Documento</th><th>Departamento</th></tr></thead>
          <tbody>
            {results.map((e) => (
              <tr key={String(e.employeeKey)}>
                <td>{String(e.employeeNumber)}</td>
                <td><Link to={`/rrhh/empleados/${encodeURIComponent(String(e.employeeKey))}`}>{String(e.displayName)}</Link></td>
                <td>{String(e.documentNumber)}</td>
                <td>{String(e.departmentKey ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function HcmContractsPage() {
  const [contracts, setContracts] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm').then(({ listHcmContracts }) => listHcmContracts({ status: 'active' }).then((r) => setContracts(r as Array<Record<string, unknown>>)));
  }, []);

  return (
    <>
      <Header title="Contratos laborales" subtitle="Indefinidos, fijos, obra, aprendizaje y más" actions={<Link to="/rrhh" className="btn">Personal</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Contrato</th><th>Empleado</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Renovaciones</th><th>Estado</th></tr></thead>
        <tbody>
          {contracts.map((c) => (
            <tr key={String(c.contractKey)}>
              <td>{String(c.contractKey)}</td>
              <td>{String(c.employeeKey)}</td>
              <td>{String(c.contractType)}</td>
              <td>{String(c.startDate).slice(0, 10)}</td>
              <td>{c.endDate ? String(c.endDate).slice(0, 10) : 'Indefinido'}</td>
              <td>{String(c.renewalCount ?? 0)}</td>
              <td>{String(c.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function HcmAuditPage() {
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    import('../api/hcm').then(({ listHcmAudit }) => listHcmAudit().then((r) => setLogs(r as Array<Record<string, unknown>>)));
  }, []);

  return (
    <>
      <Header title="Auditoría de personal" subtitle="Creación, cambios, traslados y contratos" actions={<Link to="/rrhh" className="btn">Personal</Link>} />
      <table className="data-table panel">
        <thead><tr><th>Fecha</th><th>Entidad</th><th>Clave</th><th>Acción</th><th>Usuario</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={String(l.id)}>
              <td>{String(l.createdAt).slice(0, 19)}</td>
              <td>{String(l.entityType)}</td>
              <td>{String(l.entityKey)}</td>
              <td>{String(l.action)}</td>
              <td>{String(l.userId ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function HcmEmployeeFileRoutePage() {
  const { employeeKey = '' } = useParams();
  return <HcmEmployeeFilePage employeeKey={decodeURIComponent(employeeKey)} />;
}
