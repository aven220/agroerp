/**
 * EPA-02 — Metadatos de experiencia por ruta.
 * Ayuda contextual, descripción y siguiente paso sin tocar lógica de negocio.
 */

export interface PageExperience {
  description: string;
  help: string;
  nextStep?: { label: string; to: string };
}

type RouteRule = { pattern: RegExp; experience: PageExperience };

const RULES: RouteRule[] = [
  {
    pattern: /^\/$/,
    experience: {
      description: 'Su punto de partida para iniciar el día de trabajo.',
      help: 'Use las acciones principales para registrar datos o revisar pendientes.',
      nextStep: { label: 'Registrar un productor', to: '/productores/nuevo' },
    },
  },
  {
    pattern: /^\/productores(\/|$)/,
    experience: {
      description: 'Gestione el padrón de productores y su información de contacto.',
      help: 'Busque por nombre o documento. Use «Nuevo productor» para registrar uno.',
      nextStep: { label: 'Registrar productor', to: '/productores/nuevo' },
    },
  },
  {
    pattern: /^\/fincas(\/|$)/,
    experience: {
      description: 'Administre predios, áreas y ubicación de las fincas.',
      help: 'Cada finca puede vincularse a un productor y contener varios lotes.',
      nextStep: { label: 'Registrar finca', to: '/fincas/nueva' },
    },
  },
  {
    pattern: /^\/lotes(\/|$)/,
    experience: {
      description: 'Controle lotes productivos, cultivos y actividades de campo.',
      help: 'Los lotes pertenecen a una finca. Puede importar varios desde planilla.',
      nextStep: { label: 'Registrar lote', to: '/lotes/nuevo' },
    },
  },
  {
    pattern: /^\/formularios(\/|$)/,
    experience: {
      description: 'Diseñe, publique y recopile formularios de campo.',
      help: 'Guarde como borrador, publique cuando esté listo y asigne campañas de captura.',
      nextStep: { label: 'Crear formulario', to: '/formularios/nuevo' },
    },
  },
  {
    pattern: /^\/procesos(\/|$)/,
    experience: {
      description: 'Supervise solicitudes, aprobaciones y flujos de trabajo.',
      help: 'La bandeja muestra lo que requiere su acción hoy.',
      nextStep: { label: 'Abrir bandeja', to: '/procesos/bandeja' },
    },
  },
  {
    pattern: /^\/bpms(\/|$)/,
    experience: {
      description: 'Configure y monitoree procesos automatizados de la organización.',
      help: 'Use el diseñador visual para modelar flujos sin conocimientos técnicos.',
      nextStep: { label: 'Ver bandeja de tareas', to: '/bpms/bandeja' },
    },
  },
  {
    pattern: /^\/inventario(\/|$)/,
    experience: {
      description: 'Controle existencias, movimientos y valoración de inventario.',
      help: 'Revise kardex y conteos para mantener stock confiable.',
      nextStep: { label: 'Ver movimientos', to: '/inventario/movimientos' },
    },
  },
  {
    pattern: /^\/compras(\/|$)/,
    experience: {
      description: 'Gestione compras de café desde recepción hasta liquidación.',
      help: 'El asistente de registro guía cada compra paso a paso.',
      nextStep: { label: 'Registrar compra', to: '/compras/wizard' },
    },
  },
  {
    pattern: /^\/comercial(\/|$)/,
    experience: {
      description: 'Administre ventas, clientes, pedidos y facturación.',
      help: 'Comience por clientes o pedidos según su proceso comercial.',
      nextStep: { label: 'Ver pedidos', to: '/comercial/pedidos' },
    },
  },
  {
    pattern: /^\/cadena-suministro(\/|$)/,
    experience: {
      description: 'Planifique abastecimiento, almacén y transporte.',
      help: 'Coordine demanda, inventario y entregas en un solo lugar.',
      nextStep: { label: 'Centro de suministro', to: '/cadena-suministro' },
    },
  },
  {
    pattern: /^\/manufactura(\/|$)/,
    experience: {
      description: 'Supervise producción, calidad y recursos de planta.',
      help: 'Los tableros muestran eficiencia y órdenes en curso.',
      nextStep: { label: 'Centro de manufactura', to: '/manufactura' },
    },
  },
  {
    pattern: /^\/rrhh(\/|$)|^\/portal(\/|$)/,
    experience: {
      description: 'Gestione personal, nómina, asistencia y portal del empleado.',
      help: 'Cada módulo cubre un proceso de talento humano.',
      nextStep: { label: 'Centro de personal', to: '/rrhh' },
    },
  },
  {
    pattern: /^\/finanzas(\/|$)/,
    experience: {
      description: 'Controle contabilidad, pagos, tesorería y presupuesto.',
      help: 'Los reportes financieros se generan desde cada submódulo.',
      nextStep: { label: 'Centro financiero', to: '/finanzas' },
    },
  },
  {
    pattern: /^\/bi(\/|$)/,
    experience: {
      description: 'Consulte indicadores, tableros y reportes de negocio.',
      help: 'Filtre por período y exporte cuando necesite compartir resultados.',
      nextStep: { label: 'Ver reportes', to: '/bi/reportes' },
    },
  },
  {
    pattern: /^\/iam(\/|$)|^\/administracion(\/|$)/,
    experience: {
      description: 'Configure usuarios, roles, permisos y políticas de seguridad.',
      help: 'Asigne roles antes de invitar usuarios nuevos al sistema.',
      nextStep: { label: 'Gestionar usuarios', to: '/administracion/usuarios' },
    },
  },
  {
    pattern: /^\/gestion-activos(\/|$)/,
    experience: {
      description: 'Administre activos fijos y mantenimiento preventivo.',
      help: 'Registre equipos y programe órdenes de trabajo.',
      nextStep: { label: 'Ver activos', to: '/gestion-activos' },
    },
  },
  {
    pattern: /^\/plataforma-agritech(\/|$)/,
    experience: {
      description: 'Herramientas avanzadas de agricultura de precisión y trazabilidad.',
      help: 'Explore cultivos, riego, sanidad y cumplimiento según su operación.',
      nextStep: { label: 'Plataforma agrícola', to: '/plataforma-agritech' },
    },
  },
  {
    pattern: /^\/integraciones(\/|$)|^\/plataforma-empresarial\/eip(\/|$)|^\/apis(\/|$)/,
    experience: {
      description: 'Conecte AgroERP con sistemas externos y servicios.',
      help: 'Revise el estado de conectores y errores de sincronización.',
      nextStep: { label: 'Centro de integraciones', to: '/integraciones' },
    },
  },
  {
    pattern: /^\/gis(\/|$)/,
    experience: {
      description: 'Visualice fincas, lotes y capas geográficas en mapa.',
      help: 'Importe capas o consulte ubicaciones registradas.',
      nextStep: { label: 'Abrir mapa', to: '/gis/mapa' },
    },
  },
  {
    pattern: /^\/record-explorer\//,
    experience: {
      description: 'Vista integral del registro: historial, documentos y análisis.',
      help: 'Navegue por pestañas para ver toda la información relacionada.',
    },
  },
  {
    pattern: /^\/notificaciones(\/|$)/,
    experience: {
      description: 'Central de alertas y avisos de la plataforma.',
      help: 'Marque como leídas las notificaciones ya atendidas.',
    },
  },
  {
    pattern: /^\/tareas(\/|$)/,
    experience: {
      description: 'Tareas programadas y trabajos en segundo plano.',
      help: 'Consulte el calendario para ver próximas ejecuciones.',
      nextStep: { label: 'Calendario de tareas', to: '/tareas/calendario' },
    },
  },
  {
    pattern: /^\/documentos(\/|$)/,
    experience: {
      description: 'Archivos y documentos compartidos de la organización.',
      help: 'Suba archivos y organícelos por carpeta o etiqueta.',
    },
  },
  {
    pattern: /^\/reglas(\/|$)/,
    experience: {
      description: 'Defina reglas de negocio y decisiones automatizadas.',
      help: 'Simule reglas antes de activarlas en producción.',
      nextStep: { label: 'Simulador de reglas', to: '/reglas/simulador' },
    },
  },
  {
    pattern: /^\/ia(\/|$)/,
    experience: {
      description: 'Asistente inteligente para consultas y resúmenes.',
      help: 'Formule preguntas en lenguaje natural sobre su operación.',
      nextStep: { label: 'Abrir chat', to: '/ia/chat' },
    },
  },
];

export function getPageExperience(pathname: string): PageExperience | undefined {
  for (const rule of RULES) {
    if (rule.pattern.test(pathname)) return rule.experience;
  }
  return undefined;
}
