import { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNavigation } from '../../context/NavigationContext';
import { useGuidedWorkspace } from '../../context/GuidedWorkspaceContext';
import { useAdaptiveWorkspaceOptional } from '../../context/AdaptiveWorkspaceProvider';
import { useAuth } from '../../context/AuthContext';
import { getContinueWorkItems, loadWorkEntityHistory } from '../../lib/workEntityHistory';
import { getProcessNextStep, getLatestMilestone } from '../../lib/processWorkspace';
import { canAccessPath } from '../../config/routePermissions';
import { useOnEntityUpdated } from '../../lib/entitySync';
import type { FlowId } from '../../lib/businessFlows';

const FLOW_FROM_PATH: Array<{ prefix: string; flowId: FlowId }> = [
  { prefix: '/productores', flowId: 'agricultural' },
  { prefix: '/fincas', flowId: 'agricultural' },
  { prefix: '/lotes', flowId: 'agricultural' },
  { prefix: '/formularios', flowId: 'forms' },
  { prefix: '/procesos', flowId: 'workflow' },
  { prefix: '/compras', flowId: 'purchases' },
  { prefix: '/inventario', flowId: 'inventory' },
  { prefix: '/bi', flowId: 'reports' },
  { prefix: '/integraciones', flowId: 'integrations' },
];

function detectFlowId(pathname: string): FlowId | null {
  for (const { prefix, flowId } of FLOW_FROM_PATH) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return flowId;
  }
  return null;
}

export function GuidedWorkspacePanel() {
  const { user, hasPermission } = useAuth();
  const { pathname } = useLocation();
  const { recentSearches } = useNavigation();
  const {
    panelOpen,
    setPanelOpen,
    pinned,
    unpin,
    tasks,
    addTask,
    toggleTask,
    removeTask,
    shortcuts,
    addShortcut,
    removeShortcut,
    notes,
    addNote,
    removeNote,
    workingSets,
    saveSet,
    restoreSet,
    deleteSet,
    openProcesses,
    dismissOpenProcess,
    recordIcon,
  } = useGuidedWorkspace();
  const adaptive = useAdaptiveWorkspaceOptional();

  const [taskInput, setTaskInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [shortcutLabel, setShortcutLabel] = useState('');
  const [shortcutTo, setShortcutTo] = useState('');
  const [setName, setSetName] = useState('');
  const [activeTab, setActiveTab] = useState<'work' | 'lists' | 'notes'>('work');
  const [historyTick, setHistoryTick] = useState(0);

  useOnEntityUpdated(() => setHistoryTick((t) => t + 1));

  useEffect(() => {
    if (panelOpen && adaptive?.prefs.adaptiveEnabled) {
      setActiveTab(adaptive.profile.guidedPanelTab);
    }
  }, [panelOpen, adaptive?.prefs.adaptiveEnabled, adaptive?.profile.guidedPanelTab]);

  const continueItems = useMemo(
    () => getContinueWorkItems(user?.id, 5).filter((item) => canAccessPath(item.to, hasPermission)),
    [user?.id, pinned.length, hasPermission, historyTick],
  );

  const recentRecords = useMemo(
    () => loadWorkEntityHistory(user?.id)
      .filter((item) => canAccessPath(item.to, hasPermission))
      .slice(0, 8),
    [user?.id, pathname, hasPermission, historyTick],
  );

  const visiblePinned = useMemo(
    () => pinned.filter((p) => canAccessPath(p.to, hasPermission)),
    [pinned, hasPermission],
  );

  const visibleOpenProcesses = useMemo(
    () => openProcesses.filter((p) => canAccessPath(p.to, hasPermission)),
    [openProcesses, hasPermission],
  );

  const visibleShortcuts = useMemo(
    () => shortcuts.filter((s) => canAccessPath(s.to, hasPermission)),
    [shortcuts, hasPermission],
  );

  const flowHint = useMemo(() => {
    const flowId = detectFlowId(pathname);
    if (!flowId) return null;
    const milestone = getLatestMilestone(flowId);
    if (!milestone) return null;
    return getProcessNextStep(flowId, milestone.stepId);
  }, [pathname]);

  const pendingTasks = tasks.filter((t) => !t.done);
  const pinnedByKind = useMemo(() => {
    const map = new Map<string, typeof visiblePinned>();
    for (const p of visiblePinned) {
      const list = map.get(p.kind) ?? [];
      list.push(p);
      map.set(p.kind, list);
    }
    return map;
  }, [visiblePinned]);

  if (!panelOpen) return null;

  return (
    <aside className="guided-workspace-panel" aria-label="Mi espacio de trabajo">
      <header className="gwp-header">
        <div>
          <strong className="gwp-title">Mi jornada</strong>
          <span className="gwp-subtitle muted">Espacio de trabajo personal</span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setPanelOpen(false)}
          aria-label="Cerrar espacio de trabajo"
        >
          ✕
        </button>
      </header>

      {flowHint && canAccessPath(flowHint.route, hasPermission) ? (
        <div className="gwp-flow-hint">
          <span className="muted">Siguiente en este proceso:</span>
          <Link to={flowHint.route} className="gwp-flow-hint-link">
            {flowHint.label} →
          </Link>
        </div>
      ) : null}

      <nav className="gwp-tabs" role="tablist">
        {(['work', 'lists', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`gwp-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'work' ? 'Trabajo' : tab === 'lists' ? 'Listas' : 'Notas'}
          </button>
        ))}
      </nav>

      <div className="gwp-body">
        {activeTab === 'work' && (
          <>
            {continueItems.length > 0 ? (
              <section className="gwp-section">
                <h3 className="gwp-section-title">Continuar donde quedó</h3>
                <ul className="gwp-list">
                  {continueItems.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      <Link to={item.to} className="gwp-link">
                        <span aria-hidden>{recordIcon(item.kind)}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {visibleOpenProcesses.length > 0 ? (
              <section className="gwp-section">
                <h3 className="gwp-section-title">Procesos abiertos</h3>
                <ul className="gwp-list">
                  {visibleOpenProcesses.map((p) => (
                    <li key={p.id} className="gwp-list-item-actions">
                      <Link to={p.to} className="gwp-link">
                        <span aria-hidden>⚙</span>
                        <span>{p.label}</span>
                      </Link>
                      <button
                        type="button"
                        className="gwp-icon-btn"
                        onClick={() => dismissOpenProcess(p.id)}
                        aria-label="Cerrar proceso"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="gwp-section">
              <h3 className="gwp-section-title">Fijados ({visiblePinned.length})</h3>
              {visiblePinned.length === 0 ? (
                <p className="gwp-empty muted">
                  Use «Fijar» en productores, fincas, formularios o procesos para tenerlos siempre a mano.
                </p>
              ) : (
                <ul className="gwp-list">
                  {Array.from(pinnedByKind.entries()).flatMap(([, items]) =>
                    items.map((p) => (
                      <li key={`${p.kind}-${p.id}`} className="gwp-list-item-actions">
                        <Link to={p.to} className="gwp-link">
                          <span aria-hidden>{recordIcon(p.kind)}</span>
                          <span>{p.label}</span>
                        </Link>
                        <button
                          type="button"
                          className="gwp-icon-btn"
                          onClick={() => unpin(p.kind, p.id)}
                          aria-label={`Quitar ${p.label}`}
                        >
                          ×
                        </button>
                      </li>
                    )),
                  )}
                </ul>
              )}
              {visiblePinned.length > 0 ? (
                <div className="gwp-inline-form">
                  <input
                    placeholder="Nombre del conjunto…"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    aria-label="Nombre del conjunto de trabajo"
                  />
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={!setName.trim()}
                    onClick={() => {
                      saveSet(setName.trim());
                      setSetName('');
                    }}
                  >
                    Guardar conjunto
                  </button>
                </div>
              ) : null}
            </section>

            <section className="gwp-section">
              <h3 className="gwp-section-title">Recientes</h3>
              {recentRecords.length === 0 ? (
                <p className="gwp-empty muted">Los registros que visite aparecerán aquí.</p>
              ) : (
                <ul className="gwp-list">
                  {recentRecords.map((r) => (
                    <li key={`${r.kind}-${r.id}-${r.visitedAt}`}>
                      <Link to={r.to} className="gwp-link">
                        <span aria-hidden>{recordIcon(r.kind)}</span>
                        <span>{r.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {recentSearches.length > 0 ? (
              <section className="gwp-section">
                <h3 className="gwp-section-title">Búsquedas recientes</h3>
                <div className="gwp-chips">
                  {recentSearches.slice(0, 8).map((q) => (
                    <span key={q} className="gwp-chip">{q}</span>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        {activeTab === 'lists' && (
          <>
            <section className="gwp-section">
              <h3 className="gwp-section-title">Mis pendientes ({pendingTasks.length})</h3>
              <form
                className="gwp-inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!taskInput.trim()) return;
                  addTask(taskInput.trim(), pathname !== '/' ? pathname : undefined);
                  setTaskInput('');
                }}
              >
                <input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="Agregar pendiente personal…"
                  aria-label="Nuevo pendiente"
                />
                <button type="submit" className="btn btn-sm btn-primary">+</button>
              </form>
              <ul className="gwp-list gwp-task-list">
                {tasks.map((t) => (
                  <li key={t.id} className={`gwp-task${t.done ? ' done' : ''}`}>
                    <label>
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleTask(t.id)}
                      />
                      {t.to ? (
                        <Link to={t.to} onClick={(e) => e.stopPropagation()}>{t.label}</Link>
                      ) : (
                        <span>{t.label}</span>
                      )}
                    </label>
                    <button
                      type="button"
                      className="gwp-icon-btn"
                      onClick={() => removeTask(t.id)}
                      aria-label="Eliminar pendiente"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="gwp-section">
              <h3 className="gwp-section-title">Accesos rápidos</h3>
              <div className="gwp-inline-form gwp-inline-form-stack">
                <input
                  placeholder="Etiqueta"
                  value={shortcutLabel}
                  onChange={(e) => setShortcutLabel(e.target.value)}
                  aria-label="Etiqueta del acceso"
                />
                <input
                  placeholder="Ruta, ej. /productores"
                  value={shortcutTo}
                  onChange={(e) => setShortcutTo(e.target.value)}
                  aria-label="Ruta del acceso"
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={!shortcutLabel.trim() || !shortcutTo.trim()}
                  onClick={() => {
                    addShortcut(shortcutLabel.trim(), shortcutTo.trim());
                    setShortcutLabel('');
                    setShortcutTo('');
                  }}
                >
                  Agregar acceso
                </button>
              </div>
              <ul className="gwp-list">
                {visibleShortcuts.map((s) => (
                  <li key={s.id} className="gwp-list-item-actions">
                    <Link to={s.to} className="gwp-link">
                      <span aria-hidden>{s.icon}</span>
                      <span>{s.label}</span>
                    </Link>
                    <button
                      type="button"
                      className="gwp-icon-btn"
                      onClick={() => removeShortcut(s.id)}
                      aria-label="Quitar acceso"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {workingSets.length > 0 ? (
              <section className="gwp-section">
                <h3 className="gwp-section-title">Conjuntos guardados</h3>
                <ul className="gwp-list">
                  {workingSets.map((ws) => (
                    <li key={ws.id} className="gwp-list-item-actions">
                      <button
                        type="button"
                        className="gwp-link gwp-link-btn"
                        onClick={() => restoreSet(ws.id)}
                      >
                        <span aria-hidden>📁</span>
                        <span>{ws.name} ({ws.items.length})</span>
                      </button>
                      <button
                        type="button"
                        className="gwp-icon-btn"
                        onClick={() => deleteSet(ws.id)}
                        aria-label="Eliminar conjunto"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}

        {activeTab === 'notes' && (
          <section className="gwp-section">
            <h3 className="gwp-section-title">Notas rápidas</h3>
            <form
              className="gwp-note-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!noteInput.trim()) return;
                addNote(noteInput.trim());
                setNoteInput('');
              }}
            >
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Anote algo para retomar después…"
                rows={3}
                aria-label="Nota rápida"
              />
              <button type="submit" className="btn btn-sm btn-primary">Guardar nota</button>
            </form>
            <ul className="gwp-notes">
              {notes.map((n) => (
                <li key={n.id} className="gwp-note">
                  <p>{n.text}</p>
                  <div className="gwp-note-meta">
                    <time className="muted">
                      {new Date(n.createdAt).toLocaleString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                    <button
                      type="button"
                      className="gwp-icon-btn"
                      onClick={() => removeNote(n.id)}
                      aria-label="Eliminar nota"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="gwp-footer">
        <Link to="/" className="btn btn-sm btn-block" onClick={() => setPanelOpen(false)}>
          Ir al inicio
        </Link>
      </footer>
    </aside>
  );
}
