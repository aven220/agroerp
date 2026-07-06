import { Drawer } from '../ui/Drawer';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutsContext';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { useTheme } from '../../context/ThemeContext';
import type { DateFormat, FontScale, LocaleCode, NumberFormat, VisualDensity } from '../../context/UserPreferencesContext';

export function UserPreferencesDrawer() {
  const { prefsOpen, setPrefsOpen } = useKeyboardShortcuts();
  const prefs = useUserPreferences();
  const { mode, setMode } = useTheme();

  return (
    <Drawer open={prefsOpen} title="Preferencias" onClose={() => setPrefsOpen(false)}>
      <div className="ds-prefs-form">
        <fieldset className="ds-prefs-fieldset">
          <legend>Apariencia</legend>
          <label className="ds-prefs-label">
            Tema
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="system">Sistema</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </label>
          <label className="ds-prefs-label">
            Densidad visual
            <select
              value={prefs.density}
              onChange={(e) => prefs.setPreference('density', e.target.value as VisualDensity)}
            >
              <option value="compact">Compacta</option>
              <option value="default">Normal</option>
              <option value="comfortable">Amplia</option>
            </select>
          </label>
          <label className="ds-prefs-label">
            Tamaño de fuente
            <select
              value={prefs.fontScale}
              onChange={(e) => prefs.setPreference('fontScale', e.target.value as FontScale)}
            >
              <option value="sm">Pequeña</option>
              <option value="md">Normal</option>
              <option value="lg">Grande</option>
            </select>
          </label>
          <label className="ds-prefs-label ds-checkbox">
            <input
              type="checkbox"
              checked={prefs.reducedMotion === 'reduce'}
              onChange={(e) => prefs.setPreference('reducedMotion', e.target.checked ? 'reduce' : 'system')}
            />
            Reducir animaciones
          </label>
        </fieldset>

        <fieldset className="ds-prefs-fieldset">
          <legend>Regional</legend>
          <label className="ds-prefs-label">
            Idioma
            <select
              value={prefs.locale}
              onChange={(e) => prefs.setPreference('locale', e.target.value as LocaleCode)}
            >
              <option value="es-CO">Español (Colombia)</option>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="ds-prefs-label">
            Formato de fecha
            <select
              value={prefs.dateFormat}
              onChange={(e) => prefs.setPreference('dateFormat', e.target.value as DateFormat)}
            >
              <option value="dd/MM/yyyy">DD/MM/AAAA</option>
              <option value="MM/dd/yyyy">MM/DD/AAAA</option>
              <option value="yyyy-MM-dd">AAAA-MM-DD</option>
            </select>
          </label>
          <label className="ds-prefs-label">
            Formato numérico
            <select
              value={prefs.numberFormat}
              onChange={(e) => prefs.setPreference('numberFormat', e.target.value as NumberFormat)}
            >
              <option value="es-CO">1.234,56 (CO)</option>
              <option value="en-US">1,234.56 (US)</option>
            </select>
          </label>
          <label className="ds-prefs-label">
            Zona horaria
            <select
              value={prefs.timezone}
              onChange={(e) => prefs.setPreference('timezone', e.target.value)}
            >
              <option value="America/Bogota">America/Bogota</option>
              <option value="America/Mexico_City">America/Mexico_City</option>
              <option value="America/Lima">America/Lima</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="ds-prefs-fieldset">
          <legend>Ayuda</legend>
          <label className="ds-prefs-label ds-checkbox">
            <input
              type="checkbox"
              checked={prefs.tipsEnabled}
              onChange={(e) => prefs.setPreference('tipsEnabled', e.target.checked)}
            />
            Mostrar consejos contextuales
          </label>
        </fieldset>

        <div className="ds-prefs-actions">
          <button type="button" className="btn btn-ghost" onClick={prefs.resetPreferences}>
            Restaurar predeterminados
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setPrefsOpen(false)}>
            Listo
          </button>
        </div>
      </div>
    </Drawer>
  );
}
