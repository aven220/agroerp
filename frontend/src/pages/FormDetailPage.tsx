import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { LoadingState } from '../components/ux/LoadingState';
import { FormAvailabilityBadges } from '../components/forms/FormAvailabilityBadges';
import { FormLifecycleStepper } from '../components/forms/FormLifecycleStepper';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  archiveForm,
  bootstrapForms,
  deleteForm,
  duplicateForm,
  getForm,
  getFormVersionHistory,
  newFormVersion,
  publishForm,
  restoreForm,
  submitFormForReview,
  unpublishForm,
  type FormDefinition,
  type FormVersionHistoryItem,
} from '../api/forms';
import {
  FORM_STATUS_LABELS,
  formatFormDate,
  formatModifiedBy,
  getNextLifecycleHint,
} from '../form-studio/form-lifecycle';

export function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [versions, setVersions] = useState<FormVersionHistoryItem[]>([]);
  const [inBootstrap, setInBootstrap] = useState<boolean | undefined>();
  const [loading, setLoading] = useState(true);
  const [syncChecking, setSyncChecking] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [f, hist] = await Promise.all([
        getForm(id),
        getFormVersionHistory(id).catch(() => [] as FormVersionHistoryItem[]),
      ]);
      setForm(f);
      setVersions(hist);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function checkMobileSync() {
    if (!form) return;
    setSyncChecking(true);
    try {
      const payload = await bootstrapForms();
      const found = payload.forms.some((f) => f.id === form.id);
      setInBootstrap(found);
      toast.info(
        found
          ? 'Este formulario está en el paquete de sincronización móvil. Los dispositivos lo recibirán en el próximo sync.'
          : 'No está en el bootstrap móvil. Verifique que esté publicado y con soporte offline.',
        found ? 'Disponible para Android' : 'Pendiente de sync',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo verificar sync');
    } finally {
      setSyncChecking(false);
    }
  }

  async function handlePublish() {
    if (!form || !confirm(`¿Publicar "${form.name}" v${form.version}?`)) return;
    await publishForm(form.id);
    toast.success('Formulario publicado. Ya puede sincronizarse con Android.', 'Publicado');
    load();
  }

  async function handleUnpublish() {
    if (!form || !confirm(`¿Despublicar "${form.name}"? Dejará de estar en dispositivos móviles.`)) return;
    await unpublishForm(form.id);
    toast.warning('Formulario despublicado. Vuelve a estado borrador.');
    load();
  }

  async function handleArchive() {
    if (!form || !confirm(`¿Archivar "${form.name}"?`)) return;
    await archiveForm(form.id);
    toast.info('Formulario archivado.');
    load();
  }

  async function handleRestore() {
    if (!form) return;
    await restoreForm(form.id);
    toast.success('Formulario restaurado como borrador.');
    load();
  }

  async function handleDelete() {
    if (!form) return;
    if (!confirm(`¿Eliminar "${form.name}" permanentemente?`)) return;
    await deleteForm(form.id);
    toast.success('Formulario eliminado.');
    navigate('/formularios');
  }

  async function handleDuplicate() {
    if (!form) return;
    const newKey = prompt('Nueva clave de formulario:', `${form.formKey}-copia`);
    if (!newKey) return;
    const created = await duplicateForm(form.id, newKey);
    navigate(`/formularios/${created.id}/disenar`);
  }

  async function handleNewVersion() {
    if (!form) return;
    const created = await newFormVersion(form.formKey);
    navigate(`/formularios/${created.id}/disenar`);
  }

  async function handleSubmitReview() {
    if (!form) return;
    await submitFormForReview(form.id);
    toast.info('Enviado a revisión.');
    load();
  }

  if (loading || !form) {
    return <LoadingState variant="page" message="Cargando formulario…" />;
  }

  const modifierName = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;

  const formFlowStep =
    form.status === 'published'
      ? 'capture'
      : form.status === 'draft' || form.status === 'in_review' || form.status === 'approved'
        ? 'publish'
        : 'design';

  const formNextActions = (() => {
    const base = `/formularios/${form.id}`;
    if (form.status === 'published') {
      return [
        {
          label: 'Ejecutar en web',
          description: 'Pruebe el formulario publicado',
          to: `${base}/ejecutar`,
          primary: true,
          icon: '▶️',
        },
        {
          label: 'Ir a recolección',
          description: 'Revise envíos y capturas de campo',
          to: '/formularios/recoleccion',
          icon: '📥',
        },
        {
          label: 'Asignar campaña',
          description: 'Distribuya el formulario a equipos',
          to: '/formularios/campanas',
          icon: '🎯',
        },
      ];
    }
    if (form.status === 'draft' || form.status === 'approved') {
      return [
        {
          label: 'Continuar diseño',
          description: 'Ajuste campos y validaciones',
          to: `${base}/disenar`,
          primary: true,
          icon: '✏️',
        },
        {
          label: 'Probar simulador',
          description: 'Valide el comportamiento antes de publicar',
          to: `${base}/disenar?tab=simulator`,
          icon: '🧪',
        },
      ];
    }
    return [
      {
        label: 'Editar diseño',
        description: 'Retome el formulario en el diseñador',
        to: `${base}/disenar`,
        primary: true,
        icon: '✏️',
      },
    ];
  })();

  return (
    <>
      <Header
        title={form.name}
        subtitle={`${form.formKey} · v${form.version}`}
        actions={
          <div className="row-actions">
            <Link to="/formularios" className="btn">← Mis Formularios</Link>
            <button type="button" className="btn" onClick={() => navigate(`/formularios/${form.id}/disenar`)}>
              Editar diseño
            </button>
            {form.status === 'published' && (
              <button type="button" className="btn" onClick={() => navigate(`/formularios/${form.id}/ejecutar`)}>
                Ejecutar Web
              </button>
            )}
            {(form.status === 'draft' || form.status === 'approved') && (
              <button type="button" className="btn btn-primary" onClick={handlePublish}>Publicar</button>
            )}
          </div>
        }
      />

      <FlowProgress flowId="forms" currentStepId={formFlowStep} />

      <FlowNextActions
        title="Siguiente paso en el ciclo"
        subtitle={getNextLifecycleHint(form.status)}
        actions={formNextActions}
      />

      <div className="form-detail-layout">
        <section className="panel form-detail-main">
          <div className="form-detail-meta">
            <span className={`badge badge-${form.status}`}>{FORM_STATUS_LABELS[form.status] ?? form.status}</span>
            <FormAvailabilityBadges form={form} showSyncCheck inMobileBootstrap={inBootstrap} />
          </div>

          <FormLifecycleStepper status={form.status} />

          <p className="form-lifecycle-hint">{getNextLifecycleHint(form.status)}</p>

          <dl className="form-detail-dl">
            <div><dt>Clave</dt><dd><code>{form.formKey}</code></dd></div>
            <div><dt>Versión</dt><dd>v{form.version}</dd></div>
            <div><dt>Última modificación</dt><dd>{formatFormDate(form.updatedAt)}</dd></div>
            <div><dt>Creado</dt><dd>{formatFormDate(form.createdAt)}</dd></div>
            <div><dt>Autor</dt><dd>{formatModifiedBy(form.createdBy, user?.id, modifierName)}</dd></div>
            {form.publishedAt ? (
              <div><dt>Publicado</dt><dd>{formatFormDate(form.publishedAt)}</dd></div>
            ) : null}
            <div><dt>Campos</dt><dd>{form.schema?.fields?.length ?? 0}</dd></div>
            <div><dt>Offline Android</dt><dd>{form.schema?.settings?.offlineCapable !== false ? 'Sí' : 'No'}</dd></div>
          </dl>

          {form.description ? <p className="muted">{form.description}</p> : null}
        </section>

        <aside className="panel form-detail-actions">
          <h3 className="ds-h4">Acciones</h3>
          <div className="form-action-stack">
            <button type="button" className="btn btn-block" onClick={() => navigate(`/formularios/${form.id}/disenar`)}>
              Editar
            </button>
            <button type="button" className="btn btn-block" onClick={handleNewVersion}>Nueva versión</button>
            <button type="button" className="btn btn-block" onClick={handleDuplicate}>Clonar</button>
            {form.status === 'draft' && (
              <>
                <button type="button" className="btn btn-primary btn-block" onClick={handlePublish}>Publicar</button>
                <button type="button" className="btn btn-block" onClick={handleSubmitReview}>Enviar a revisión</button>
              </>
            )}
            {form.status === 'published' && (
              <>
                <button type="button" className="btn btn-block" onClick={() => navigate(`/formularios/${form.id}/ejecutar`)}>
                  Ejecutar en Web
                </button>
                <button type="button" className="btn btn-block" onClick={handleUnpublish}>Despublicar</button>
                <button
                  type="button"
                  className="btn btn-block"
                  disabled={syncChecking}
                  onClick={checkMobileSync}
                >
                  {syncChecking ? 'Verificando…' : 'Verificar sync Android'}
                </button>
              </>
            )}
            {form.status === 'archived' ? (
              <button type="button" className="btn btn-block" onClick={handleRestore}>Restaurar</button>
            ) : (
              <button type="button" className="btn btn-block" onClick={handleArchive}>Archivar</button>
            )}
            <button type="button" className="btn btn-danger btn-block" onClick={handleDelete}>Eliminar</button>
          </div>
        </aside>
      </div>

      {versions.length > 0 && (
        <section className="panel" style={{ marginTop: '1rem' }}>
          <h3 className="ds-h4">Historial de versiones</h3>
          <table className="data-table">
            <thead>
              <tr><th>Versión</th><th>Estado</th><th>Creado</th><th>Publicado</th></tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id}>
                  <td>v{v.version}</td>
                  <td><span className={`badge badge-${v.status}`}>{FORM_STATUS_LABELS[v.status] ?? v.status}</span></td>
                  <td>{formatFormDate(v.createdAt)}</td>
                  <td>{v.publishedAt ? formatFormDate(v.publishedAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
