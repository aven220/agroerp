import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle() {
  const { resolved, mode, setMode, toggle } = useTheme();

  return (
    <div className="theme-toggle-group" role="group" aria-label="Tema de interfaz">
      <button
        type="button"
        className="theme-toggle"
        onClick={toggle}
        title={resolved === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-label={resolved === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
      >
        {resolved === 'dark' ? '☀' : '☾'}
      </button>
      <button
        type="button"
        className={`theme-toggle theme-toggle-system${mode === 'system' ? ' active' : ''}`}
        onClick={() => setMode('system')}
        title="Seguir preferencia del sistema"
        aria-label="Tema automático del sistema"
        aria-pressed={mode === 'system'}
      >
        ◐
      </button>
    </div>
  );
}
