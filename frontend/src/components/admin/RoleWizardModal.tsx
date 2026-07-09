import { useEffect, useState } from 'react';
import type { Permission, Role } from '../../types';
import { ADMIN_HELP_CARDS, ROLE_WIZARD_STEPS, slugifyRoleName } from '../../lib/adminLabels';
import { PermissionMatrix } from './PermissionMatrix';
import { PermissionSummary } from './PermissionSummary';

interface RoleWizardModalProps {
  open: boolean;
  editingRole: Role | null;
  permissions: Permission[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: { name: string; slug: string; permissionKeys: string[] }) => void;
}

export function RoleWizardModal({
  open,
  editingRole,
  permissions,
  saving,
  error,
  onClose,
  onSave,
}: RoleWizardModalProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setName(editingRole?.name ?? '');
    setSlug(editingRole?.slug ?? '');
    setSlugManual(Boolean(editingRole));
    setSelectedPerms(
      editingRole?.rolePermissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`) ?? [],
    );
  }, [open, editingRole]);

  useEffect(() => {
    if (!slugManual && !editingRole?.isSystem) {
      setSlug(slugifyRoleName(name));
    }
  }, [name, slugManual, editingRole?.isSystem]);

  if (!open) return null;

  const isLast = step === ROLE_WIZARD_STEPS.length - 1;
  const isFirst = step === 0;
  const canNext = step === 0 ? name.trim().length >= 2 && slug.trim().length >= 2 : true;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLast) {
      if (canNext) setStep((s) => s + 1);
      return;
    }
    onSave({ name: name.trim(), slug: slug.trim(), permissionKeys: selectedPerms });
  }

  return (
    <div className="admin-wizard-overlay" role="dialog" aria-modal="true" aria-labelledby="role-wizard-title">
      <div className="admin-wizard admin-wizard-wide">
        <header className="admin-wizard-header">
          <div>
            <h2 id="role-wizard-title">{editingRole ? 'Editar rol' : 'Asistente: nuevo rol'}</h2>
            <p className="muted">{ROLE_WIZARD_STEPS[step].hint}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <nav className="admin-wizard-steps" aria-label="Pasos del asistente">
          {ROLE_WIZARD_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`admin-wizard-step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <form onSubmit={handleSubmit} className="admin-wizard-body">
          {error ? <div className="alert alert-error">{error}</div> : null}

          {step === 0 ? (
            <div className="admin-wizard-grid">
              <div className="admin-wizard-main">
                {editingRole?.isSystem ? (
                  <div className="alert alert-warning">
                    Rol del sistema: el nombre y el identificador interno no se pueden cambiar. Puede ajustar los permisos.
                  </div>
                ) : null}
                <label className="admin-field">
                  <span>Nombre del rol *</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={editingRole?.isSystem || saving}
                    placeholder="Ej. Supervisor de campo"
                    autoFocus
                  />
                  <span className="ds-field-hint">Nombre visible para administradores y usuarios.</span>
                </label>

                <details className="admin-slug-details" open={slugManual}>
                  <summary>
                    Identificador interno
                    {!slugManual && !editingRole ? (
                      <span className="muted"> — generado automáticamente</span>
                    ) : null}
                  </summary>
                  <label className="admin-field">
                    <input
                      value={slug}
                      onChange={(e) => {
                        setSlugManual(true);
                        setSlug(e.target.value);
                      }}
                      required
                      disabled={editingRole?.isSystem || saving}
                      placeholder="supervisor_campo"
                    />
                    <span className="ds-field-hint">
                      Código técnico. Solo necesario para integraciones; puede dejarlo automático.
                    </span>
                  </label>
                  {!editingRole && !slugManual ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setSlugManual(true)}
                    >
                      Editar manualmente
                    </button>
                  ) : null}
                </details>
              </div>

              <aside className="admin-wizard-aside">
                {ADMIN_HELP_CARDS.map((card) => (
                  <div key={card.title} className="admin-help-card">
                    <strong>{card.title}</strong>
                    <p className="muted">{card.body}</p>
                  </div>
                ))}
              </aside>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="admin-wizard-perms-layout">
              <div className="admin-wizard-perms-matrix">
                <p className="muted admin-wizard-intro">
                  Marque lo que podrá hacer este rol. Agrupe por área de negocio y use la búsqueda para encontrar permisos específicos.
                </p>
                <PermissionMatrix
                  permissions={permissions}
                  selected={selectedPerms}
                  onChange={setSelectedPerms}
                />
              </div>
              <aside className="admin-wizard-perms-summary">
                <PermissionSummary
                  permissions={permissions}
                  selected={selectedPerms}
                  roleName={name || 'Nuevo rol'}
                />
              </aside>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="admin-wizard-review">
              <dl className="admin-review-dl">
                <div>
                  <dt>Nombre</dt>
                  <dd>{name}</dd>
                </div>
                <div>
                  <dt>Identificador interno</dt>
                  <dd><code>{slug}</code></dd>
                </div>
                <div>
                  <dt>Permisos</dt>
                  <dd>{selectedPerms.length} seleccionados</dd>
                </div>
              </dl>
              <PermissionSummary permissions={permissions} selected={selectedPerms} roleName={name} />
            </div>
          ) : null}

          <footer className="admin-wizard-footer">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <div className="row-actions">
              {!isFirst ? (
                <button type="button" className="btn" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                  Anterior
                </button>
              ) : null}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !canNext}
              >
                {saving
                  ? 'Guardando…'
                  : isLast
                    ? editingRole
                      ? 'Guardar cambios'
                      : 'Crear rol'
                    : 'Siguiente'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
