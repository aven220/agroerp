import { DomainLanding } from '../components/landing/DomainLanding';

/**
 * PM-43 — Centro de Configuración (landing). Sin tablas.
 */
export function ConfigLandingPage() {
  return (
    <DomainLanding
      title="Centro de Configuración"
      subtitle="Empresa, accesos, series y puesta en marcha"
      description="Configure el sistema por áreas. Cada tarjeta abre el proceso correspondiente."
      metrics={[
        { label: 'Áreas', value: 8, tone: 'teal' },
        { label: 'Puesta en marcha', value: 'EIC', hint: 'Centro de implementación' },
      ]}
      quickActions={[
        { label: 'Ir a implementación', to: '/implementacion', primary: true },
        { label: 'Estado del sistema', to: '/implementacion/estado' },
      ]}
      modules={[
        { id: 'emp', title: 'Empresa', description: 'Datos fiscales y ficha', to: '/implementacion/empresa', icon: '🏢' },
        { id: 'usr', title: 'Usuarios', description: 'Cuentas de acceso', to: '/implementacion/usuarios', icon: '👥' },
        { id: 'rol', title: 'Roles', description: 'Perfiles y permisos', to: '/implementacion/roles', icon: '🔐' },
        { id: 'ser', title: 'Series / numeración', description: 'Documentos y consecutivos', to: '/implementacion/documentos', icon: '🔢' },
        { id: 'par', title: 'Parámetros', description: 'Reglas de compras', to: '/compras/config/parametros', icon: '🎛' },
        { id: 'wf', title: 'Workflow', description: 'Procesos y aprobaciones', to: '/procesos', icon: '🔄' },
        { id: 'doc', title: 'Documentos', description: 'Numeración y evidencias', to: '/implementacion/documentos', icon: '📄' },
        { id: 'imp', title: 'Implementación', description: 'Checklist y Go Live', to: '/implementacion', icon: '🧭' },
      ]}
      pending={[
        { id: 'go', label: 'Revisar Go Live', to: '/implementacion/go-live' },
        { id: 'est', label: 'Estado de preparación', to: '/implementacion/estado' },
      ]}
      activity={[
        { id: 'a1', label: 'Configuración operativa', to: '/implementacion/configuracion' },
        { id: 'a2', label: 'Integraciones', to: '/implementacion/integraciones' },
      ]}
      activityTitle="Accesos frecuentes"
      pendingTitle="Próximas acciones"
    />
  );
}
