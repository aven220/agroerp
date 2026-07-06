import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { BiWidgetRenderer } from '../components/bi/BiWidgetRenderer';
import {
  BI_CATEGORIES,
  BI_DATA_SOURCES,
  BI_WIDGET_TYPES,
  createBiDashboard,
  getBiDashboard,
  previewBiQuery,
  publishBiDashboard,
  resolveBiWidgets,
  updateBiDashboard,
  type BiDashboardDefinition,
  type BiWidgetDefinition,
  type ResolvedWidget,
} from '../api/bi';

function emptyDefinition(): BiDashboardDefinition {
  return { version: 1, widgets: [], settings: { refreshIntervalSec: 60 } };
}

export function BiDashboardDesignerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [dashboardKey, setDashboardKey] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('custom');
  const [definition, setDefinition] = useState<BiDashboardDefinition>(emptyDefinition());
  const [preview, setPreview] = useState<ResolvedWidget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragType, setDragType] = useState<string>('kpi');

  const selected = definition.widgets.find((w) => w.id === selectedId);

  useEffect(() => {
    if (!id) return;
    getBiDashboard(id).then((d) => {
      setDashboardKey(d.dashboardKey);
      setName(d.name);
      setCategory(d.category);
      const def = d.versions?.[0]?.definition as BiDashboardDefinition | undefined;
      if (def) setDefinition(def);
    });
  }, [id]);

  useEffect(() => {
    if (definition.widgets.length) {
      resolveBiWidgets(definition.widgets, category).then(setPreview);
    } else {
      setPreview([]);
    }
  }, [definition, category]);

  function addWidget(type: string) {
    const w: BiWidgetDefinition = {
      id: `w-${Date.now()}`,
      type,
      title: `Widget ${type}`,
      x: 0,
      y: definition.widgets.length * 2,
      w: type === 'table' ? 6 : 3,
      h: type === 'table' ? 3 : 2,
      query: { dataSource: 'producers', limit: 10 },
    };
    setDefinition((prev) => ({ ...prev, widgets: [...prev.widgets, w] }));
    setSelectedId(w.id);
  }

  function updateSelected(patch: Partial<BiWidgetDefinition>) {
    if (!selectedId) return;
    setDefinition((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === selectedId ? { ...w, ...patch } : w)),
    }));
  }

  function removeSelected() {
    if (!selectedId) return;
    setDefinition((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== selectedId),
    }));
    setSelectedId(null);
  }

  async function handleSave(publish = false) {
    setSaving(true);
    try {
      if (isNew) {
        const created = await createBiDashboard({
          dashboardKey: dashboardKey || `dash-${Date.now()}`,
          name: name || 'Nuevo dashboard',
          category,
          definition,
        });
        if (publish) await publishBiDashboard(created.id);
        navigate(`/bi/dashboards/${created.id}`);
      } else {
        await updateBiDashboard(id!, { name, category, definition });
        if (publish) await publishBiDashboard(id!);
        navigate(`/bi/dashboards/${id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  function onCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    addWidget(dragType);
  }

  return (
    <>
      <Header
        title={isNew ? 'Constructor de Dashboards' : `Editar: ${name}`}
        subtitle="Diseñador drag & drop EBIAP"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => navigate('/bi/dashboards')}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => handleSave(false)}>
              Guardar
            </button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => handleSave(true)}>
              Publicar
            </button>
          </div>
        }
      />

      <div className="bi-designer-layout">
        <aside className="bi-palette panel">
          <h3>Widgets</h3>
          {BI_WIDGET_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className="bi-palette-item"
              draggable
              onDragStart={() => setDragType(t)}
              onClick={() => addWidget(t)}
            >
              {t}
            </button>
          ))}
        </aside>

        <main className="bi-canvas panel" onDragOver={(e) => e.preventDefault()} onDrop={onCanvasDrop}>
          <div className="form-row">
            {isNew && (
              <label>
                Clave
                <input value={dashboardKey} onChange={(e) => setDashboardKey(e.target.value)} />
              </label>
            )}
            <label>
              Nombre
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Categoría
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {BI_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="bi-dashboard-grid">
            {preview.map((w, i) => {
              const def = definition.widgets[i];
              return (
                <div
                  key={def?.id ?? i}
                  className={`bi-dashboard-cell${selectedId === def?.id ? ' selected' : ''}`}
                  onClick={() => def && setSelectedId(def.id)}
                >
                  <BiWidgetRenderer widget={w} />
                </div>
              );
            })}
            {definition.widgets.length === 0 && (
              <p className="bi-drop-hint">Arrastre widgets aquí o haga clic en la paleta</p>
            )}
          </div>
        </main>

        <aside className="bi-inspector panel">
          <h3>Propiedades</h3>
          {selected ? (
            <>
              <label>
                Título
                <input value={selected.title} onChange={(e) => updateSelected({ title: e.target.value })} />
              </label>
              <label>
                Tipo
                <input value={selected.type} readOnly />
              </label>
              <label>
                Fuente de datos
                <select
                  value={(selected.query?.dataSource as string) ?? 'producers'}
                  onChange={(e) =>
                    updateSelected({
                      query: { ...selected.query, dataSource: e.target.value, limit: 10 },
                    })
                  }
                >
                  {BI_DATA_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>
                KPI Key
                <input
                  value={selected.kpiKey ?? ''}
                  onChange={(e) => updateSelected({ kpiKey: e.target.value || undefined })}
                />
              </label>
              <button type="button" className="btn btn-sm" onClick={removeSelected}>Eliminar widget</button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  if (selected.query) {
                    previewBiQuery(selected.query).then((r) => alert(`${r.rows.length} filas`));
                  }
                }}
              >
                Probar consulta
              </button>
            </>
          ) : (
            <p className="text-muted">Seleccione un widget</p>
          )}
        </aside>
      </div>
    </>
  );
}
