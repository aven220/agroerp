import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormsPlatformNav } from '../components/forms/FormsPlatformNav';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { ProcessWorkspacePanel } from '../components/process/ProcessWorkspacePanel';
import {
  PageLayout,
  PageHeader,
  PageSection,
  PageState,
  PageSummary,
  MetricCard,
  TableToolbar,
  DescriptionList,
  SimpleRecordsTable,
  type SimpleColumn,
} from '../components/page';
import { listForms, listSubmissions, type FormSubmission } from '../api/forms';
import { formatFormDate } from '../form-studio/form-lifecycle';
import {
  buildRecordExplorerPath,
  type UreRouteEntityType,
} from '../record-explorer/types';
import { useOnEntityUpdated } from '../lib/entitySync';

const SYNC_LABELS: Record<string, string> = {
  synced: 'Sincronizado',
  pending: 'Pendiente',
  conflict: 'Conflicto',
};

export function FormCollectionPage() {
  const [items, setItems] = useState<FormSubmission[]>([]);
  const [formFilter, setFormFilter] = useState('');
  const [syncFilter, setSyncFilter] = useState('');
  const [search, setSearch] = useState('');
  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FormSubmission | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, formList] = await Promise.all([
        listSubmissions(formFilter ? { formId: formFilter } : undefined),
        listForms(),
      ]);
      setItems(subs);
      setForms(formList.map((f) => ({ id: f.id, name: f.name })));
      setLastLoadedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar envíos');
    } finally {
      setLoading(false);
    }
  }, [formFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useOnEntityUpdated(load, ['capture', 'form']);

  const filtered = useMemo(() => {
    return items.filter((s) => {
      if (syncFilter && s.syncStatus !== syncFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.form?.name?.toLowerCase().includes(q) ||
        s.form?.formKey?.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    });
  }, [items, syncFilter, search]);

  const kpis = useMemo(
    () => ({
      total: filtered.length,
      synced: filtered.filter((s) => s.syncStatus === 'synced').length,
      pending: filtered.filter((s) => s.syncStatus === 'pending').length,
      failed: filtered.filter((s) => s.syncStatus === 'conflict').length,
      withGps: filtered.filter((s) => s.gpsLocation || hasGpsInData(s.data)).length,
      withMedia: filtered.filter((s) => hasMediaInData(s.data)).length,
      fromAndroid: filtered.filter((s) => isAndroidSubmission(s)).length,
    }),
    [filtered],
  );

  const selectedEntityLink = selected ? extractEntityLinkFromSubmission(selected) : null;

  const columns: SimpleColumn<FormSubmission>[] = [
    {
      key: 'form',
      label: 'Formulario',
      getValue: (r) => r.form?.name ?? r.formId,
    },
    {
      key: 'origen',
      label: 'Origen',
      getValue: (r) => (isAndroidSubmission(r) ? 'Android' : 'Web'),
      render: (r) => (
        <span className={`badge${isAndroidSubmission(r) ? ' badge-teal' : ''}`}>
          {isAndroidSubmission(r) ? 'Android' : 'Web'}
        </span>
      ),
    },
    { key: 'status', label: 'Estado', getValue: (r) => r.status },
    {
      key: 'syncStatus',
      label: 'Sincronización',
      render: (r) => (
        <span className={`badge sync-${r.syncStatus}`}>
          {SYNC_LABELS[r.syncStatus] ?? r.syncStatus}
        </span>
      ),
      getValue: (r) => SYNC_LABELS[r.syncStatus] ?? r.syncStatus,
    },
    {
      key: 'gps',
      label: 'GPS',
      getValue: (r) => (r.gpsLocation || hasGpsInData(r.data) ? 'Sí' : '—'),
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      getValue: (r) => formatFormDate(r.createdAt),
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Recolección"
        subtitle="Registros enviados desde web o la app Android (misma organización y servidor)"
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => load()}
            disabled={loading}
          >
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        }
      />
      <FormsPlatformNav />

      <FlowProgress flowId="forms" currentStepId="capture" />

      <ProcessWorkspacePanel flowId="forms" currentStepId="capture" showChecklist={false} />

      <p className="muted form-collection-sync-hint">
        Los envíos de la APK aparecen aquí solo después de sincronizar en el teléfono (misma empresa y
        mismo servidor). Actualizar solo vuelve a consultar el servidor; no empuja datos desde el
        dispositivo.
        {lastLoadedAt ? <> Última consulta: {lastLoadedAt.toLocaleString('es-CO')}.</> : null}
      </p>

      <FlowNextActions
        title="Después de capturar"
        subtitle="Revise envíos, consulte el expediente o envíe a aprobación."
        actions={[
          {
            label: 'Llenar otro formulario',
            description: 'Vuelva al catálogo de formularios publicados',
            to: '/formularios',
            primary: true,
            icon: '📝',
          },
          {
            label: 'Bandeja de aprobaciones',
            description: 'Si el flujo requiere revisión',
            to: '/procesos/bandeja',
            icon: '✅',
          },
          {
            label: 'Explorar productores',
            description: 'Consulte expedientes desde el listado PRM',
            to: '/productores',
            icon: '📂',
          },
        ]}
      />

      <PageSummary>
        <MetricCard label="Diligenciados" value={kpis.total} />
        <MetricCard label="Desde Android" value={kpis.fromAndroid} tone="teal" />
        <MetricCard label="Sincronizados" value={kpis.synced} tone="green" />
        <MetricCard label="Pendientes" value={kpis.pending} />
        <MetricCard label="Con GPS" value={kpis.withGps} />
        <MetricCard label="Con multimedia" value={kpis.withMedia} />
      </PageSummary>

      {error ? <PageState variant="error" message={error} onRetry={load} /> : null}

      <PageSection title="Envíos">
        <TableToolbar>
          <input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={formFilter} onChange={(e) => setFormFilter(e.target.value)}>
            <option value="">Todos los formularios</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select value={syncFilter} onChange={(e) => setSyncFilter(e.target.value)}>
            <option value="">Toda sincronización</option>
            <option value="synced">Sincronizado</option>
            <option value="pending">Pendiente</option>
            <option value="conflict">Conflicto</option>
          </select>
          <button type="button" className="btn btn-sm" onClick={() => load()} disabled={loading}>
            Actualizar
          </button>
        </TableToolbar>

        <div className="form-collection-layout">
          <div className="form-collection-list">
            <SimpleRecordsTable
              gridId="form-collection"
              columns={columns}
              data={filtered}
              loading={loading}
              selectable={false}
              onRowClick={(s) => setSelected(s)}
              emptyMessage="Sin envíos en el servidor"
              emptyDescription="Si llenó formularios en Android, abra la app → Sincronizar y luego Actualizar aquí. Use la misma cuenta/organización y el mismo servidor (p. ej. https://20.231.96.53)."
            />
          </div>

          <aside className="panel form-collection-detail">
            <h3 className="ds-h4">Detalle del registro</h3>
            {!selected ? (
              <p className="muted">Seleccione un envío para ver campos, GPS y evidencias.</p>
            ) : (
              <>
                <DescriptionList
                  items={[
                    { term: 'ID', detail: <code>{selected.id.slice(0, 8)}…</code> },
                    { term: 'Formulario', detail: selected.form?.name },
                    { term: 'Origen', detail: isAndroidSubmission(selected) ? 'Android' : 'Web' },
                    { term: 'Versión', detail: `v${selected.formVersion}` },
                    {
                      term: 'Sincronización',
                      detail: SYNC_LABELS[selected.syncStatus] ?? selected.syncStatus,
                    },
                    { term: 'Fecha', detail: formatFormDate(selected.createdAt) },
                  ]}
                />
                {selected.gpsLocation ? (
                  <p className="form-gps-preview">
                    GPS: {selected.gpsLocation.lat?.toFixed?.(5)},{' '}
                    {selected.gpsLocation.lng?.toFixed?.(5)}
                  </p>
                ) : null}
                <h4>Respuestas</h4>
                <dl className="form-submission-fields">
                  {Object.entries(selected.data ?? {}).map(([key, val]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{formatValue(val)}</dd>
                    </div>
                  ))}
                </dl>
                {selectedEntityLink ? (
                  <Link
                    to={buildRecordExplorerPath(
                      selectedEntityLink.entityType,
                      selectedEntityLink.recordId,
                    )}
                    className="btn btn-sm"
                  >
                    {selectedEntityLink.label}
                  </Link>
                ) : null}
                <Link to="/formularios/exportar" className="btn btn-sm">
                  Exportar datos
                </Link>
              </>
            )}
          </aside>
        </div>
      </PageSection>
    </PageLayout>
  );
}

function isAndroidSubmission(s: FormSubmission): boolean {
  const info = s.deviceInfo as Record<string, unknown> | undefined;
  const platform = String(info?.platform ?? info?.os ?? '').toLowerCase();
  return platform.includes('android');
}

function hasGpsInData(data: Record<string, unknown>): boolean {
  return Object.values(data ?? {}).some(
    (v) => v && typeof v === 'object' && 'lat' in (v as object) && 'lng' in (v as object),
  );
}

function hasMediaInData(data: Record<string, unknown>): boolean {
  return Object.values(data ?? {}).some((v) => {
    if (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)) return true;
    if (Array.isArray(v) && v.some((x) => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x))) {
      return true;
    }
    return false;
  });
}

function formatValue(val: unknown): string {
  if (val == null) return '—';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

interface SubmissionEntityLink {
  entityType: UreRouteEntityType;
  recordId: string;
  label: string;
}

function extractEntityLinkFromSubmission(submission: FormSubmission): SubmissionEntityLink | null {
  const ctx = submission.context as Record<string, unknown> | undefined;
  const resolved = ctx?.resolvedEntity as { entityType?: string; entityId?: string } | undefined;
  if (resolved?.entityType && resolved?.entityId) {
    return mapEntityToLink(resolved.entityType, resolved.entityId);
  }

  const data = submission.data ?? {};
  const producerId = readStringId(data, ['producerId', 'producer_id']);
  if (producerId) {
    return { entityType: 'producer', recordId: producerId, label: 'Ver expediente completo' };
  }
  const farmId = readStringId(data, ['farmId', 'farm_id', 'farmUnitId', 'farm_unit_id']);
  if (farmId) {
    return { entityType: 'farm', recordId: farmId, label: 'Ver expediente completo' };
  }
  const lotId = readStringId(data, ['lotId', 'lot_id', 'fieldLotId', 'field_lot_id']);
  if (lotId) {
    return { entityType: 'lot', recordId: lotId, label: 'Ver expediente completo' };
  }
  return null;
}

function readStringId(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function mapEntityToLink(entityType: string, recordId: string): SubmissionEntityLink | null {
  const normalized = entityType.trim().toLowerCase();
  if (normalized === 'producer') {
    return { entityType: 'producer', recordId, label: 'Ver expediente completo' };
  }
  if (normalized === 'farm' || normalized === 'farmunit') {
    return { entityType: 'farm', recordId, label: 'Ver expediente completo' };
  }
  if (normalized === 'lot' || normalized === 'fieldlotprofile') {
    return { entityType: 'lot', recordId, label: 'Ver expediente completo' };
  }
  return null;
}
