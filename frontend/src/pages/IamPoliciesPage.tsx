import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { getIamSecurityPolicy, updateIamSecurityPolicy, setupIamMfa, verifyIamMfa } from '../api/iam';

type PolicyForm = {
  minPasswordLength: number | '';
  maxFailedAttempts: number | '';
  lockoutMinutes: number | '';
  mfaRequired: boolean;
};

const POLICY_DEFAULTS: PolicyForm = {
  minPasswordLength: 8,
  maxFailedAttempts: 5,
  lockoutMinutes: 30,
  mfaRequired: false,
};

function toForm(raw: Record<string, unknown> | null): PolicyForm {
  if (!raw) return { ...POLICY_DEFAULTS };
  return {
    minPasswordLength: numOrEmpty(raw.minPasswordLength, POLICY_DEFAULTS.minPasswordLength as number),
    maxFailedAttempts: numOrEmpty(raw.maxFailedAttempts, POLICY_DEFAULTS.maxFailedAttempts as number),
    lockoutMinutes: numOrEmpty(raw.lockoutMinutes, POLICY_DEFAULTS.lockoutMinutes as number),
    mfaRequired: Boolean(raw.mfaRequired),
  };
}

function numOrEmpty(value: unknown, fallback: number): number | '' {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parsePositive(value: number | '', label: string, min: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < min) {
    throw new Error(`${label} debe ser al menos ${min}.`);
  }
  return Math.floor(n);
}

export function IamPoliciesPage() {
  const { hasPermission } = useAuth();
  const canManagePolicy = hasPermission('iam:policy:manage') || hasPermission('iam:admin');
  const canManageMfa = hasPermission('iam:mfa:manage') || canManagePolicy;
  const [form, setForm] = useState<PolicyForm>(POLICY_DEFAULTS);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!canManagePolicy && !canManageMfa) return;
    getIamSecurityPolicy()
      .then((policy) => {
        setForm(toForm(policy));
        setLoaded(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la política');
        setLoaded(true);
      });
  }, [canManagePolicy, canManageMfa]);

  function setNumberField(key: keyof Pick<PolicyForm, 'minPasswordLength' | 'maxFailedAttempts' | 'lockoutMinutes'>, raw: string) {
    if (raw === '') {
      setForm((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setForm((prev) => ({ ...prev, [key]: n }));
  }

  async function save() {
    if (!canManagePolicy) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const payload = {
        minPasswordLength: parsePositive(form.minPasswordLength, 'La longitud mínima', 6),
        maxFailedAttempts: parsePositive(form.maxFailedAttempts, 'Los intentos fallidos', 1),
        lockoutMinutes: parsePositive(form.lockoutMinutes, 'La duración del bloqueo', 1),
        mfaRequired: Boolean(form.mfaRequired),
      };
      const updated = (await updateIamSecurityPolicy(payload)) as Record<string, unknown>;
      setForm(toForm(updated));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar las políticas');
    } finally {
      setSaving(false);
    }
  }

  if (!canManagePolicy && !canManageMfa) {
    return (
      <>
        <Header
          title="Políticas de seguridad"
          actions={<Link to="/iam" className="btn">Usuarios y accesos</Link>}
        />
        <div className="alert alert-error">No tiene permisos para administrar políticas de seguridad.</div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Políticas de seguridad"
        subtitle="Reglas de contraseñas, bloqueo de cuentas y autenticación en dos pasos"
        actions={<Link to="/iam" className="btn">Usuarios y accesos</Link>}
      />

      <p className="muted page-help">
        Estas políticas aplican a todos los usuarios de la organización. Cambios en contraseñas y bloqueos surten efecto en el próximo inicio de sesión.
      </p>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {saved ? <div className="alert alert-success">Políticas guardadas correctamente.</div> : null}

      {canManagePolicy && loaded ? (
        <form
          className="panel form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <h3>Contraseñas y bloqueo</h3>
          <div className="form-grid">
            <label>
              Longitud mínima de contraseña
              <input
                type="number"
                min={6}
                inputMode="numeric"
                value={form.minPasswordLength === '' ? '' : form.minPasswordLength}
                onChange={(e) => setNumberField('minPasswordLength', e.target.value)}
              />
              <span className="ds-field-hint">Mínimo 6. Recomendado: 10 o más.</span>
            </label>
            <label>
              Intentos fallidos antes de bloquear
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={form.maxFailedAttempts === '' ? '' : form.maxFailedAttempts}
                onChange={(e) => setNumberField('maxFailedAttempts', e.target.value)}
              />
              <span className="ds-field-hint">Tras superar este número, la cuenta se bloquea temporalmente.</span>
            </label>
            <label>
              Duración del bloqueo (minutos)
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={form.lockoutMinutes === '' ? '' : form.lockoutMinutes}
                onChange={(e) => setNumberField('lockoutMinutes', e.target.value)}
              />
            </label>
            <label className="admin-field" style={{ alignSelf: 'end' }}>
              <span>Exigir autenticación en dos pasos</span>
              <input
                type="checkbox"
                checked={form.mfaRequired}
                onChange={(e) => setForm((prev) => ({ ...prev, mfaRequired: e.target.checked }))}
              />
              <span className="ds-field-hint">Todos los usuarios deberán configurar una app autenticadora.</span>
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar políticas'}
            </button>
          </div>
        </form>
      ) : null}

      {canManageMfa ? (
        <section className="panel">
          <h3>Autenticación en dos pasos (app móvil)</h3>
          <p className="muted">
            Permite a los usuarios vincular una aplicación como Google Authenticator o Microsoft Authenticator.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setMfaMessage(null);
              setupIamMfa()
                .then(() =>
                  setMfaMessage(
                    'Configuración iniciada. Escanee el código QR en su aplicación autenticadora y verifique con el código de 6 dígitos.',
                  ),
                )
                .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo configurar la autenticación en dos pasos'));
            }}
          >
            Iniciar configuración
          </button>
          {mfaMessage ? <p className="muted">{mfaMessage}</p> : null}
          <div className="form-row" style={{ marginTop: '1rem' }}>
            <input
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="Código de 6 dígitos"
              inputMode="numeric"
              maxLength={6}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => verifyIamMfa(mfaCode).then(() => setMfaMessage('Código verificado correctamente.'))}
            >
              Verificar código
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
