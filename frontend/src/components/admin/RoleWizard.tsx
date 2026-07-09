import { useEffect, useState } from 'react';
import type { Permission, Role } from '../../types';
import { ADMIN_VALIDATION } from '../../lib/adminErrorMessages';
import {
  ADMIN_HELP_CARDS,
  ROLE_COLORS,
  ROLE_ICONS,
  ROLE_WIZARD_STEPS,
  slugifyRoleName,
} from '../../lib/adminLabels';
import { permissionsForTemplate, ROLE_TEMPLATES } from '../../lib/adminRoleTemplates';
import { ContextHelp } from './ContextHelp';
import { PermissionCards } from './PermissionCards';
import { PermissionReview } from './PermissionReview';
import { PermissionSummary } from './PermissionSummary';
import { WizardSuccess } from './WizardSuccess';

export interface RoleWizardSaveData {
  name: string;
  slug: string;
  description?: string;
  permissionKeys: string[];
}

interface RoleWizardProps {
  open: boolean;
  editingRole: Role | null;
  permissions: Permission[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: RoleWizardSaveData) => Promise<void>;
  onCreateUserWithRole?: (roleSlug: string) => void;
  onCreateAnotherRole?: () => void;
  onViewRoles?: () => void;
  onFlowComplete?: () => void;
}

export function RoleWizard({
  open,
  editingRole,
  permissions,
  saving,
  error,
  onClose,
  onSave,
  onCreateUserWithRole,
  onCreateAnotherRole,
  onViewRoles,
  onFlowComplete,
}: RoleWizardProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [roleIcon, setRoleIcon] = useState('📋');
  const [roleColor, setRoleColor] = useState<string>(ROLE_COLORS[0]);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ slug: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSuccess(null);
    setLocalError(null);
    setName(editingRole?.name ?? '');
    setDescription(editingRole?.description ?? '');
    setSlug(editingRole?.slug ?? '');
    setSlugManual(Boolean(editingRole));
    setRoleIcon('📋');
    setRoleColor(ROLE_COLORS[0]);
    setSelectedPerms(
      editingRole?.rolePermissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ) ?? [],
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
  const isCreate = !editingRole;
  const displayError = localError ?? error;

  function validateStep(): boolean {
    setLocalError(null);
    if (step === 0) {
      if (!name.trim()) {
        setLocalError(ADMIN_VALIDATION.roleNameRequired);
        return false;
      }
      if (name.trim().length < 2) {
        setLocalError(ADMIN_VALIDATION.roleNameMin);
        return false;
      }
    }
    if (step === 1 && selectedPerms.length === 0) {
      setLocalError(ADMIN_VALIDATION.rolePermsRequired);
      return false;
    }
    return true;
  }

  function applyTemplate(templateId: string) {
    const template = ROLE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setName(template.name);
    setDescription(template.description);
    setRoleIcon(template.icon);
    setRoleColor(template.color);
    setSelectedPerms(permissionsForTemplate(template, permissions));
    setSlugManual(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (success) return;
    if (!validateStep()) return;

    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        permissionKeys: selectedPerms,
      });
      if (isCreate) {
        setSuccess({ slug: slug.trim(), name: name.trim() });
      } else {
        onClose();
      }
    } catch {
      /* parent sets error */
    }
  }

  function handleClose() {
    setSuccess(null);
    onClose();
  }

  return (
    <div
      className="admin-wizard-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-wizard-title"
    >
      <header className="admin-wizard-header admin-wizard-header--fullscreen">
        <div>
          <p className="admin-wizard-eyebrow">Administración · Asistente de rol</p>
          <h1 id="role-wizard-title">
            {editingRole ? 'Editar rol' : 'Crear rol'}
            <ContextHelp topic="role" />
          </h1>
          {!success ? (
            <p className="muted">{ROLE_WIZARD_STEPS[step].hint}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleClose}
          disabled={saving}
          aria-label="Cerrar"
        >
          ✕
        </button>
      </header>

      {success ? (
        <div className="admin-wizard-body admin-wizard-body--centered">
          <WizardSuccess
            title="Rol creado correctamente"
            message={`El rol «${success.name}» ya está disponible para asignar a usuarios.`}
            question="¿Qué desea hacer ahora?"
            options={[
              {
                id: 'user',
                label: 'Crear un usuario usando este rol',
                description: 'Invite a alguien y asígnele el rol recién creado',
                primary: true,
                onClick: () => {
                  const s = success;
                  handleClose();
                  if (s && onCreateUserWithRole) onCreateUserWithRole(s.slug);
                },
              },
              {
                id: 'another',
                label: 'Crear otro rol',
                description: 'Defina otro perfil de acceso',
                onClick: () => {
                  handleClose();
                  onCreateAnotherRole?.();
                },
              },
              {
                id: 'panel',
                label: 'Volver al panel',
                description: 'Regrese al dashboard de administración',
                onClick: () => {
                  handleClose();
                  onFlowComplete?.();
                },
              },
              {
                id: 'advanced',
                label: 'Configurar permisos avanzados',
                description: 'Revise y ajuste roles existentes',
                onClick: () => {
                  handleClose();
                  onViewRoles?.();
                },
              },
            ]}
          />
        </div>
      ) : (
        <>
          <nav
            className="admin-wizard-steps admin-wizard-steps--fullscreen"
            aria-label="Pasos del asistente"
          >
            {ROLE_WIZARD_STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`admin-wizard-step${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}
                onClick={() => i < step && setStep(i)}
                disabled={i > step || saving}
              >
                <span className="admin-wizard-step-index">{i + 1}</span>
                {s.label.replace(/^\d+\.\s*/, '')}
              </button>
            ))}
          </nav>

          <form onSubmit={handleSubmit} className="admin-wizard-body admin-wizard-body--fullscreen">
            {displayError ? (
              <div className="alert alert-error" role="alert">
                {displayError}
              </div>
            ) : null}

            {step === 0 ? (
              <div className="admin-wizard-grid">
                <div className="admin-wizard-main">
                  {editingRole?.isSystem ? (
                    <div className="alert alert-warning">
                      Rol del sistema: el nombre no se puede cambiar. Puede ajustar los permisos.
                    </div>
                  ) : null}

                  {!editingRole ? (
                    <div className="admin-role-templates">
                      <p className="admin-role-templates-label">
                        Comience con un ejemplo <ContextHelp topic="permission" />
                      </p>
                      <div className="admin-role-templates-grid">
                        {ROLE_TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className={`admin-role-template${name === t.name ? ' admin-role-template--active' : ''}`}
                            style={{ '--role-color': t.color } as React.CSSProperties}
                            onClick={() => applyTemplate(t.id)}
                          >
                            <span className="admin-role-template-icon" aria-hidden>
                              {t.icon}
                            </span>
                            <strong>{t.name}</strong>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div
                    className="admin-role-preview-badge"
                    style={{ '--role-color': roleColor } as React.CSSProperties}
                  >
                    <span className="admin-role-preview-icon" aria-hidden>
                      {roleIcon}
                    </span>
                    <span>{name.trim() || 'Nuevo rol'}</span>
                  </div>

                  <label className="admin-field">
                    <span>Nombre del rol *</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={editingRole?.isSystem || saving}
                      placeholder="Ej. Supervisor de campo"
                      autoFocus
                    />
                  </label>

                  <label className="admin-field">
                    <span>Descripción</span>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={saving}
                      rows={3}
                      placeholder="Para qué sirve este rol y quién debería tenerlo"
                    />
                  </label>

                  <div className="admin-role-appearance">
                    <fieldset className="admin-role-appearance-group">
                      <legend>Icono</legend>
                      <div className="admin-role-icon-picker">
                        {ROLE_ICONS.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            className={`admin-role-icon-btn${roleIcon === icon ? ' active' : ''}`}
                            onClick={() => setRoleIcon(icon)}
                            aria-label={`Icono ${icon}`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset className="admin-role-appearance-group">
                      <legend>Color</legend>
                      <div className="admin-role-color-picker">
                        {ROLE_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`admin-role-color-btn${roleColor === color ? ' active' : ''}`}
                            style={{ background: color }}
                            onClick={() => setRoleColor(color)}
                            aria-label={`Color ${color}`}
                          />
                        ))}
                      </div>
                    </fieldset>
                  </div>

                  <details className="admin-slug-details admin-advanced-options">
                    <summary>Opciones avanzadas</summary>
                    <label className="admin-field">
                      <span>Identificador interno</span>
                      <input
                        value={slug}
                        onChange={(e) => {
                          setSlugManual(true);
                          setSlug(e.target.value);
                        }}
                        disabled={editingRole?.isSystem || saving}
                        placeholder="Generado automáticamente"
                      />
                      <span className="ds-field-hint">
                        Solo para integraciones técnicas. Los usuarios no lo ven.
                      </span>
                    </label>
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
              <div className="admin-wizard-perms-cards-layout">
                <div>
                  <p className="muted admin-wizard-intro">
                    Elija qué podrá hacer este rol. Use lenguaje claro — no necesita conocer códigos
                    técnicos.
                  </p>
                  <PermissionCards
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
                <PermissionReview
                  permissions={permissions}
                  selected={selectedPerms}
                  roleName={name.trim() || 'Nuevo rol'}
                />
                <dl className="admin-review-dl">
                  <div>
                    <dt>Nombre</dt>
                    <dd>{name}</dd>
                  </div>
                  {description ? (
                    <div>
                      <dt>Descripción</dt>
                      <dd>{description}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}

            <footer className="admin-wizard-footer admin-wizard-footer--fullscreen">
              <button type="button" className="btn" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <div className="row-actions">
                {!isFirst ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setLocalError(null);
                      setStep((s) => s - 1);
                    }}
                    disabled={saving}
                  >
                    Anterior
                  </button>
                ) : null}
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
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
        </>
      )}
    </div>
  );
}
