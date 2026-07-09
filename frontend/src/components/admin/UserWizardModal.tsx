import { useEffect, useState } from 'react';
import type { Role } from '../../types';
import { ADMIN_VALIDATION, friendlyAdminError } from '../../lib/adminErrorMessages';
import { USER_STATUS_LABELS, USER_WIZARD_STEPS } from '../../lib/adminLabels';
import { ContextHelp } from './ContextHelp';
import { PermissionSummary } from './PermissionSummary';
import { WizardSuccess } from './WizardSuccess';

export interface UserWizardFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  roleSlug: string;
  status: 'active' | 'inactive' | 'locked' | 'pending' | 'expired';
}

interface UserWizardModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  roles: Role[];
  permissions?: import('../../types').Permission[];
  initial: UserWizardFormData;
  locked: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: UserWizardFormData) => Promise<void>;
  onViewUsers?: () => void;
  onBackToDashboard?: () => void;
  onFlowComplete?: () => void;
}

export function UserWizardModal({
  open,
  mode,
  roles,
  permissions = [],
  initial,
  locked,
  saving,
  error,
  onClose,
  onSave,
  onViewUsers,
  onBackToDashboard,
  onFlowComplete,
}: UserWizardModalProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<UserWizardFormData>(initial);
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSuccess(false);
    setLocalError(null);
    setForm(initial);
  }, [open, initial]);

  if (!open) return null;

  const isCreate = mode === 'create';
  const isLast = isCreate ? step === USER_WIZARD_STEPS.length - 1 : true;
  const isFirst = step === 0;
  const selectedRole = roles.find((r) => r.slug === form.roleSlug);
  const rolePermKeys =
    selectedRole?.rolePermissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    ) ?? [];

  const canNext =
    step === 0
      ? form.firstName.trim() && form.lastName.trim() && (isCreate ? form.documentNumber.trim() : true)
      : step === 1
        ? isCreate
          ? form.email.trim() && form.password.length >= 8
          : true
        : step === 2
          ? Boolean(form.roleSlug)
          : true;

  const displayError = localError ?? error;

  function validateStep(): boolean {
    setLocalError(null);
    if (step === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setLocalError(ADMIN_VALIDATION.userNameRequired);
        return false;
      }
      if (isCreate && !form.documentNumber.trim()) {
        setLocalError(ADMIN_VALIDATION.userDocumentRequired);
        return false;
      }
    }
    if (step === 1 && isCreate) {
      if (!form.email.trim()) {
        setLocalError(ADMIN_VALIDATION.userEmailRequired);
        return false;
      }
      if (form.password.length < 8) {
        setLocalError(ADMIN_VALIDATION.userPasswordMin);
        return false;
      }
    }
    if (step === 2 && !form.roleSlug) {
      setLocalError(ADMIN_VALIDATION.userRoleRequired);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (success) return;
    if (isCreate && !isLast) {
      if (!validateStep()) return;
      setStep((s) => s + 1);
      return;
    }
    try {
      await onSave(form);
      if (isCreate) {
        setSuccess(true);
      } else {
        onClose();
      }
    } catch {
      /* error handled by parent */
    }
  }

  function update<K extends keyof UserWizardFormData>(key: K, value: UserWizardFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function finishSuccess() {
    setSuccess(false);
    onClose();
  }

  function createAnother() {
    setSuccess(false);
    setStep(0);
    setForm({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      documentNumber: '',
      roleSlug: roles[0]?.slug ?? 'viewer',
      status: 'active',
    });
  }

  return (
    <div
      className="admin-wizard-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-wizard-title"
    >
      <header className="admin-wizard-header admin-wizard-header--fullscreen">
        <div>
          <p className="admin-wizard-eyebrow">Administración</p>
          <h1 id="user-wizard-title">
            {isCreate ? 'Crear usuario' : 'Editar usuario'}
            {isCreate ? <ContextHelp topic="user" /> : null}
          </h1>
          {!success && isCreate ? (
            <p className="muted">{USER_WIZARD_STEPS[step].hint}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => (success ? finishSuccess() : onClose())}
          disabled={saving}
          aria-label="Cerrar"
        >
          ✕
        </button>
      </header>

      {success ? (
        <div className="admin-wizard-body admin-wizard-body--centered">
          <WizardSuccess
            title="Usuario creado correctamente"
            message={`${form.firstName} ${form.lastName} ya puede ingresar con ${form.email}.`}
            question="¿Qué desea hacer ahora?"
            options={[
              {
                id: 'list',
                label: 'Ir al listado de usuarios',
                description: 'Revise cuentas y estados',
                primary: true,
                onClick: () => {
                  finishSuccess();
                  onViewUsers?.();
                },
              },
              {
                id: 'another',
                label: 'Crear otro usuario',
                description: 'Invite a otra persona',
                onClick: createAnother,
              },
              {
                id: 'dashboard',
                label: 'Volver al Dashboard',
                description: 'Regrese al panel de administración',
                onClick: () => {
                  finishSuccess();
                  onBackToDashboard?.();
                  onFlowComplete?.();
                },
              },
            ]}
          />
        </div>
      ) : (
        <>
          {isCreate ? (
            <nav
              className="admin-wizard-steps admin-wizard-steps--fullscreen"
              aria-label="Pasos del asistente"
            >
              {USER_WIZARD_STEPS.map((s, i) => (
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
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="admin-wizard-body admin-wizard-body--fullscreen"
          >
            {displayError ? (
              <div className="alert alert-error" role="alert">
                {displayError}
              </div>
            ) : null}
            {locked ? (
              <div className="alert alert-warning">
                Esta cuenta está bloqueada por intentos fallidos de inicio de sesión. Guarde con
                estado <strong>Activo</strong> para restaurar el acceso.
              </div>
            ) : null}

            {!isCreate ? (
              <div className="admin-wizard-stack">
                <div className="form-grid">
                  <label>
                    Nombre
                    <input
                      value={form.firstName}
                      onChange={(e) => update('firstName', e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Apellido
                    <input
                      value={form.lastName}
                      onChange={(e) => update('lastName', e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Documento
                    <input
                      value={form.documentNumber}
                      onChange={(e) => update('documentNumber', e.target.value)}
                    />
                  </label>
                  <label>
                    Email
                    <input type="email" value={form.email} disabled />
                  </label>
                  <label>
                    Nueva contraseña
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      minLength={8}
                      placeholder="Dejar vacío para no cambiar"
                      autoComplete="new-password"
                    />
                  </label>
                  <label>
                    Rol
                    <select
                      value={form.roleSlug}
                      onChange={(e) => update('roleSlug', e.target.value)}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.slug}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Estado
                    <select
                      value={form.status}
                      onChange={(e) =>
                        update('status', e.target.value as UserWizardFormData['status'])
                      }
                    >
                      {Object.entries(USER_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {isCreate && step === 0 ? (
              <div className="admin-wizard-stack admin-wizard-panel">
                <p className="muted">Paso 1 — Información personal de quien tendrá acceso.</p>
                <div className="form-grid">
                  <label>
                    Nombre *
                    <input
                      value={form.firstName}
                      onChange={(e) => update('firstName', e.target.value)}
                      required
                      autoFocus
                    />
                  </label>
                  <label>
                    Apellido *
                    <input
                      value={form.lastName}
                      onChange={(e) => update('lastName', e.target.value)}
                      required
                    />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    Documento de identidad *
                    <input
                      value={form.documentNumber}
                      onChange={(e) => update('documentNumber', e.target.value)}
                      required
                      placeholder="Cédula, NIT o pasaporte"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {isCreate && step === 1 ? (
              <div className="admin-wizard-stack admin-wizard-panel">
                <p className="muted">Paso 2 — Credenciales de ingreso al sistema.</p>
                <div className="form-grid">
                  <label style={{ gridColumn: '1 / -1' }}>
                    Correo electrónico *
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      required
                      placeholder="usuario@empresa.com"
                    />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    Contraseña inicial *
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <span className="ds-field-hint">
                      Comparta esta contraseña de forma segura. El usuario podrá cambiarla después.
                    </span>
                  </label>
                </div>
              </div>
            ) : null}

            {isCreate && step === 2 ? (
              <div className="admin-wizard-stack admin-wizard-panel">
                <p className="muted">
                  Paso 3 — Rol que define qué podrá hacer esta persona.{' '}
                  <ContextHelp topic="role" />
                </p>
                <div className="admin-role-picker">
                  {roles.length === 0 ? (
                    <div className="alert alert-warning">
                      No hay roles disponibles. Cree un rol antes de invitar usuarios.
                    </div>
                  ) : (
                    roles.map((r) => (
                      <label
                        key={r.id}
                        className={`admin-role-option${form.roleSlug === r.slug ? ' admin-role-option--selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="roleSlug"
                          value={r.slug}
                          checked={form.roleSlug === r.slug}
                          onChange={(e) => update('roleSlug', e.target.value)}
                        />
                        <span>
                          <strong>{r.name}</strong>
                          {r.description ? (
                            <span className="muted">{r.description}</span>
                          ) : (
                            <span className="muted">
                              {r.rolePermissions?.length ?? 0} permisos asignados
                            </span>
                          )}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {selectedRole && permissions.length > 0 ? (
                  <PermissionSummary
                    permissions={permissions}
                    selected={rolePermKeys}
                    roleName={selectedRole.name}
                    compact
                  />
                ) : null}
              </div>
            ) : null}

            {isCreate && step === 3 ? (
              <div className="admin-wizard-review">
                <p className="admin-wizard-review-lead">Paso 4 — Revise antes de crear la cuenta:</p>
                <dl className="admin-review-dl">
                  <div>
                    <dt>Nombre completo</dt>
                    <dd>
                      {form.firstName} {form.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt>Documento</dt>
                    <dd>{form.documentNumber}</dd>
                  </div>
                  <div>
                    <dt>Correo</dt>
                    <dd>{form.email}</dd>
                  </div>
                  <div>
                    <dt>Rol</dt>
                    <dd>{selectedRole?.name ?? form.roleSlug}</dd>
                  </div>
                  <div>
                    <dt>Estado inicial</dt>
                    <dd>Activo</dd>
                  </div>
                </dl>
                {selectedRole && permissions.length > 0 ? (
                  <PermissionSummary
                    permissions={permissions}
                    selected={rolePermKeys}
                    roleName={selectedRole.name}
                  />
                ) : null}
              </div>
            ) : null}

            <footer className="admin-wizard-footer admin-wizard-footer--fullscreen">
              <button type="button" className="btn" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <div className="row-actions">
                {isCreate && !isFirst ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setStep((s) => s - 1)}
                    disabled={saving}
                  >
                    Anterior
                  </button>
                ) : null}
                <button type="submit" className="btn btn-primary" disabled={saving || !canNext}>
                  {saving
                    ? 'Guardando…'
                    : isCreate
                      ? isLast
                        ? 'Crear usuario'
                        : 'Siguiente'
                      : 'Guardar cambios'}
                </button>
              </div>
            </footer>
          </form>
        </>
      )}
    </div>
  );
}
