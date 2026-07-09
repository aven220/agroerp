import { useEffect, useState } from 'react';
import type { Role } from '../../types';
import { USER_STATUS_LABELS, USER_WIZARD_STEPS } from '../../lib/adminLabels';

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
  initial: UserWizardFormData;
  locked: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: UserWizardFormData) => void;
}

export function UserWizardModal({
  open,
  mode,
  roles,
  initial,
  locked,
  saving,
  error,
  onClose,
  onSave,
}: UserWizardModalProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<UserWizardFormData>(initial);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm(initial);
  }, [open, initial]);

  if (!open) return null;

  const isCreate = mode === 'create';
  const isLast = step === USER_WIZARD_STEPS.length - 1;
  const isFirst = step === 0;
  const selectedRole = roles.find((r) => r.slug === form.roleSlug);

  const canNext =
    step === 0
      ? form.firstName.trim() && form.lastName.trim() && (isCreate ? form.documentNumber.trim() : true)
      : step === 1
        ? isCreate
          ? form.email.trim() && form.password.length >= 8 && form.roleSlug
          : form.roleSlug
        : true;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLast) {
      if (canNext) setStep((s) => s + 1);
      return;
    }
    onSave(form);
  }

  function update<K extends keyof UserWizardFormData>(key: K, value: UserWizardFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="admin-wizard-overlay" role="dialog" aria-modal="true" aria-labelledby="user-wizard-title">
      <div className="admin-wizard">
        <header className="admin-wizard-header">
          <div>
            <h2 id="user-wizard-title">{isCreate ? 'Asistente: nuevo usuario' : 'Editar usuario'}</h2>
            <p className="muted">{USER_WIZARD_STEPS[step].hint}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving} aria-label="Cerrar">
            ✕
          </button>
        </header>

        {isCreate ? (
          <nav className="admin-wizard-steps" aria-label="Pasos del asistente">
            {USER_WIZARD_STEPS.map((s, i) => (
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
        ) : null}

        <form onSubmit={handleSubmit} className="admin-wizard-body">
          {error ? <div className="alert alert-error">{error}</div> : null}
          {locked ? (
            <div className="alert alert-warning">
              Esta cuenta está bloqueada por intentos fallidos de inicio de sesión. Guarde con estado{' '}
              <strong>Activo</strong> para restaurar el acceso.
            </div>
          ) : null}

          {(isCreate ? step === 0 : true) && !isCreate ? (
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
                  <select value={form.roleSlug} onChange={(e) => update('roleSlug', e.target.value)}>
                    {roles.map((r) => (
                      <option key={r.id} value={r.slug}>{r.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Estado
                  <select
                    value={form.status}
                    onChange={(e) => update('status', e.target.value as UserWizardFormData['status'])}
                  >
                    {Object.entries(USER_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          {isCreate && step === 0 ? (
            <div className="admin-wizard-stack">
              <p className="muted">Datos de la persona que tendrá acceso al sistema.</p>
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
            <div className="admin-wizard-stack">
              <p className="muted">Defina cómo ingresará al sistema y qué rol tendrá asignado.</p>
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
                  <span className="ds-field-hint">Comparta esta contraseña de forma segura. El usuario podrá cambiarla después.</span>
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Rol asignado *
                  <select value={form.roleSlug} onChange={(e) => update('roleSlug', e.target.value)} required>
                    {roles.map((r) => (
                      <option key={r.id} value={r.slug}>{r.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              {selectedRole ? (
                <div className="admin-help-card">
                  <strong>Rol seleccionado: {selectedRole.name}</strong>
                  <p className="muted">
                    Este usuario heredará {selectedRole.rolePermissions?.length ?? 0} permisos definidos para el rol.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {isCreate && step === 2 ? (
            <div className="admin-wizard-review">
              <dl className="admin-review-dl">
                <div><dt>Nombre completo</dt><dd>{form.firstName} {form.lastName}</dd></div>
                <div><dt>Documento</dt><dd>{form.documentNumber}</dd></div>
                <div><dt>Correo</dt><dd>{form.email}</dd></div>
                <div><dt>Rol</dt><dd>{selectedRole?.name ?? form.roleSlug}</dd></div>
                <div><dt>Estado inicial</dt><dd>Activo</dd></div>
              </dl>
              <p className="muted">
                Al confirmar, se creará la cuenta y el usuario podrá iniciar sesión con el correo y la contraseña definidos.
              </p>
            </div>
          ) : null}

          <footer className="admin-wizard-footer">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <div className="row-actions">
              {isCreate && !isFirst ? (
                <button type="button" className="btn" onClick={() => setStep((s) => s - 1)} disabled={saving}>
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
      </div>
    </div>
  );
}
