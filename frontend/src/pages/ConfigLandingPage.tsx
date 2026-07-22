import { DomainLanding } from '../components/landing/DomainLanding';

/**
 * PM-46 — Configuración: Empresa · Usuarios · Roles · Numeraciones · dominios · Preferencias.
 */
export function ConfigLandingPage() {
  return (
    <DomainLanding
      title="Configuración"
      subtitle="Empresa, accesos, numeraciones y preferencias"
      description="Configure el ERP por área de negocio. Sin módulos técnicos."
      metrics={[
        { label: 'Áreas', value: 10, tone: 'teal' },
        { label: 'Puesta en marcha', value: 'Lista', hint: 'Checklist de preparación' },
      ]}
      quickActions={[
        { label: 'Empresa', to: '/implementacion/empresa', primary: true },
        { label: 'Preparación', to: '/implementacion/estado' },
      ]}
      modules={[
        { id: 'emp', title: 'Empresa', description: 'Datos fiscales y ficha', to: '/implementacion/empresa', icon: '🏢' },
        { id: 'usr', title: 'Usuarios', description: 'Cuentas de acceso', to: '/implementacion/usuarios', icon: '👥' },
        { id: 'rol', title: 'Roles', description: 'Perfiles y permisos', to: '/implementacion/roles', icon: '🔐' },
        { id: 'ser', title: 'Numeraciones', description: 'Series y consecutivos', to: '/implementacion/documentos', icon: '🔢' },
        { id: 'com', title: 'Compras', description: 'Parámetros y centros', to: '/compras/config', icon: '🛒' },
        { id: 'inv', title: 'Inventario', description: 'Parámetros de stock', to: '/inventario/parametros', icon: '📦' },
        { id: 'wf', title: 'Workflow', description: 'Procesos y aprobaciones', to: '/procesos', icon: '🔄' },
        { id: 'doc', title: 'Documentos', description: 'Plantillas y evidencias', to: '/implementacion/documentos', icon: '📄' },
        { id: 'int', title: 'Integraciones', description: 'Balanzas y conexiones', to: '/implementacion/integraciones', icon: '🔗' },
        { id: 'pref', title: 'Preferencias', description: 'Resumen de configuración', to: '/configuracion', icon: '◫' },
      ]}
      pending={[
        { id: 'go', label: 'Revisar Go Live', to: '/implementacion/go-live' },
        { id: 'est', label: 'Estado de preparación', to: '/implementacion/estado' },
      ]}
      activity={[
        { id: 'a1', label: 'Usuarios', to: '/implementacion/usuarios' },
        { id: 'a2', label: 'Roles', to: '/implementacion/roles' },
      ]}
      activityTitle="Accesos frecuentes"
      pendingTitle="Próximas acciones"
      modulesTitle="Áreas de configuración"
    />
  );
}
