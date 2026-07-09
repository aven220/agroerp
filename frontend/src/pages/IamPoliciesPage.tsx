import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import { getIamSecurityPolicy, updateIamSecurityPolicy, setupIamMfa, verifyIamMfa } from '../api/iam';

export function IamPoliciesPage() {
  const { hasPermission } = useAuth();
  const canManagePolicy = hasPermission('iam:policy:manage');
  const canManageMfa = hasPermission('iam:mfa:manage');
  const [policy, setPolicy] = useState<Record<string, unknown> | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!canManagePolicy && !canManageMfa) return;
    getIamSecurityPolicy().then(setPolicy).catch((err) => {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la política');
    });
  }, [canManagePolicy, canManageMfa]);

  async function save() {
    if (!policy || !canManagePolicy) return;
    await updateIamSecurityPolicy(policy);
    setSaved(true);
    getIamSecurityPolicy().then(setPolicy);
    window.setTimeout(() => setSaved(false), 3000);
  }

  if (!canManagePolicy && !canManageMfa) {
    return (
      <>
        <Header
          title="Políticas de seguridad"
          actions={<Link to="/iam" className="btn">Centro de seguridad</Link>}
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
        actions={<Link to="/iam" className="btn">Centro de seguridad</Link>}
      />

      <p className="muted page-help">
        Estas políticas aplican a todos los usuarios de la organización. Cambios en contraseñas y bloqueos surten efecto en el próximo inicio de sesión.
      </p>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {saved ? <div className="alert alert-success">Políticas guardadas correctamente.</div> : null}

      {canManagePolicy && policy ? (
        <form className="panel form-panel" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <h3>Contraseñas y bloqueo</h3>
          <div className="form-grid">
            <label>
              Longitud mínima de contraseña
              <input
                type="number"
                min={6}
                value={Number(policy.minPasswordLength)}
                onChange={(e) => setPolicy({ ...policy, minPasswordLength: Number(e.target.value) })}
              />
              <span className="ds-field-hint">Recomendado: 10 o más caracteres.</span>
            </label>
            <label>
              Intentos fallidos antes de bloquear
              <input
                type="number"
                min={1}
                value={Number(policy.maxFailedAttempts)}
                onChange={(e) => setPolicy({ ...policy, maxFailedAttempts: Number(e.target.value) })}
              />
              <span className="ds-field-hint">Tras superar este número, la cuenta se bloquea temporalmente.</span>
            </label>
            <label>
              Duración del bloqueo (minutos)
              <input
                type="number"
                min={1}
                value={Number(policy.lockoutMinutes)}
                onChange={(e) => setPolicy({ ...policy, lockoutMinutes: Number(e.target.value) })}
              />
            </label>
            <label className="admin-field" style={{ alignSelf: 'end' }}>
              <span>Exigir autenticación en dos pasos</span>
              <input
                type="checkbox"
                checked={Boolean(policy.mfaRequired)}
                onChange={(e) => setPolicy({ ...policy, mfaRequired: e.target.checked })}
              />
              <span className="ds-field-hint">Todos los usuarios deberán configurar una app autenticadora.</span>
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Guardar políticas</button>
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
