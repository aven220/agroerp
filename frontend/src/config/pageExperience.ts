/**
 * EPA-02 / PM-28 — Metadatos de experiencia por ruta.
 * Qué hago / por qué / cuándo / qué ocurre después.
 */

export interface PageExperience {
  description: string;
  help: string;
  /** ¿Por qué existe esta pantalla? */
  why?: string;
  /** ¿Cuándo la uso? */
  when?: string;
  /** ¿Qué ocurre después? */
  after?: string;
  nextStep?: { label: string; to: string };
}

type RouteRule = { pattern: RegExp; experience: PageExperience };

const RULES: RouteRule[] = [
  {
    pattern: /^\/operacion(\/|$)/,
    experience: {
      description: 'Su trabajo del día según su rol: pendientes, riesgos y siguiente acción.',
      help: 'Empiece por el botón principal o la cola «Qué hacer ahora».',
      why: 'Evita el dashboard genérico: cada rol ve solo lo relevante.',
      when: 'Al iniciar la jornada o al volver de una tarea.',
      after: 'Ejecute la acción recomendada (cola, pesaje, calidad, movimientos o reportes).',
      nextStep: { label: 'Abrir compras', to: '/compras' },
    },
  },
  {
    pattern: /^\/compras\/cola(\/|$)/,
    experience: {
      description: 'Llame turnos y priorice la fila de espera de recepciones.',
      help: 'Use «Llamar siguiente» cuando el puesto esté libre.',
      why: 'Ordena la atención y reduce tiempos de espera.',
      when: 'Durante la jornada de compras, con productores en patio.',
      after: 'El ticket avanza a pesaje o atención.',
      nextStep: { label: 'Ir a pesaje', to: '/compras/pesaje' },
    },
  },
  {
    pattern: /^\/gerencia(\/|$)/,
    experience: {
      description: 'Resumen ejecutivo: KPIs, tendencias, riesgos y alertas.',
      help: 'Aquí no se registran recepciones ni liquidaciones. Use Operación para el trabajo del día.',
      why: 'Da a gerencia una visión de control sin ruido operativo.',
      when: 'En revisiones diarias o semanales de desempeño.',
      after: 'Profundice a reportes o tableros si necesita detalle.',
      nextStep: { label: 'Ver reportes', to: '/bi' },
    },
  },
  {
    pattern: /^\/implementacion(\/|$)/,
    experience: {
      description: 'Punto único para implementar la cooperativa: checklist vivo, dependencias y Go Live.',
      help: 'Responda desde aquí: qué falta, qué bloquea y qué certificar. No recorra pantallas al azar.',
      why: 'Un consultor debe implementar sin ayuda del desarrollador.',
      when: 'Durante el despliegue y hasta certificar empresa lista.',
      after: 'Continúe la siguiente etapa de la cadena o certifique en Go Live.',
      nextStep: { label: 'Ver Go Live', to: '/implementacion/go-live' },
    },
  },
  {
    pattern: /^\/ayuda(\/|$)/,
    experience: {
      description: 'Guía práctica por experiencia: qué hacer en cada pantalla.',
      help: 'Elija un área y lea qué / por qué / cuándo / después.',
      why: 'Sustituye la ayuda genérica por orientación de producto.',
      when: 'Cuando no sepa por dónde empezar en una pantalla.',
      after: 'Abra la pantalla recomendada y ejecute el siguiente paso.',
    },
  },
  {
    pattern: /^\/$/,
    experience: {
      description: 'Su punto de partida. Prefiera Mi día para el trabajo operativo.',
      help: 'Use Mi día para pendientes reales del día.',
      why: 'Orienta al usuario al centro correcto según su rol.',
      when: 'Al entrar al sistema.',
      after: 'Vaya a Operación, Gerencia o Implementación según su trabajo.',
      nextStep: { label: 'Abrir Mi día', to: '/operacion' },
    },
  },
  {
    pattern: /^\/productores(\/|$)/,
    experience: {
      description: 'Gestione el padrón de productores y su información de contacto.',
      help: 'Busque por nombre o documento. Use «Nuevo productor» para registrar uno.',
      why: 'Los productores son la base de compras, fincas y liquidaciones.',
      when: 'Al afiliar, actualizar o consultar un productor.',
      after: 'Puede vincular fincas/lotes o iniciar una recepción.',
      nextStep: { label: 'Registrar productor', to: '/productores/nuevo' },
    },
  },
  {
    pattern: /^\/fincas(\/|$)/,
    experience: {
      description: 'Administre predios, áreas y ubicación de las fincas.',
      help: 'Cada finca puede vincularse a un productor y contener varios lotes.',
      why: 'Ubica la producción y soporta trazabilidad territorial.',
      when: 'Al registrar o actualizar predios de un productor.',
      after: 'Cree lotes o asocie la finca a una compra.',
      nextStep: { label: 'Registrar finca', to: '/fincas/nueva' },
    },
  },
  {
    pattern: /^\/lotes(\/|$)/,
    experience: {
      description: 'Controle lotes productivos, cultivos y actividades de campo.',
      help: 'Los lotes pertenecen a una finca. Puede importar varios desde planilla.',
      why: 'Permite seguimiento agronómico y de cosecha por unidad productiva.',
      when: 'Al planificar o registrar actividad de campo.',
      after: 'Actualice estado o vincule a operaciones de cosecha.',
      nextStep: { label: 'Registrar lote', to: '/lotes/nuevo' },
    },
  },
  {
    pattern: /^\/formularios(\/|$)/,
    experience: {
      description: 'Diseñe, publique y recopile formularios de campo.',
      help: 'Guarde como borrador, publique cuando esté listo y asigne campañas de captura.',
      why: 'Estandariza la captura de datos en campo.',
      when: 'Al crear o publicar un formulario operativo.',
      after: 'Los usuarios de campo podrán capturar y enviar respuestas.',
      nextStep: { label: 'Crear formulario', to: '/formularios/nuevo' },
    },
  },
  {
    pattern: /^\/procesos(\/|$)/,
    experience: {
      description: 'Supervise solicitudes, aprobaciones y flujos de trabajo.',
      help: 'La bandeja muestra lo que requiere su acción hoy.',
      why: 'Controla decisiones y evita cuellos de botella.',
      when: 'Cuando Mi día indique aprobaciones o atrasos.',
      after: 'El trámite avanza al siguiente paso o se cierra.',
      nextStep: { label: 'Abrir bandeja', to: '/procesos/bandeja' },
    },
  },
  {
    pattern: /^\/bpms(\/|$)/,
    experience: {
      description: 'Configure y monitoree procesos automatizados de la organización.',
      help: 'Use el diseñador visual para modelar flujos sin conocimientos técnicos.',
      why: 'Automatiza recorridos repetitivos de aprobación.',
      when: 'Al diseñar o ajustar un proceso de negocio.',
      after: 'Las instancias nuevas seguirán el flujo publicado.',
      nextStep: { label: 'Ver bandeja de tareas', to: '/bpms/bandeja' },
    },
  },
  {
    pattern: /^\/inventario(\/|$)/,
    experience: {
      description: 'Controle existencias, movimientos y valoración de inventario.',
      help: 'Revise kardex y conteos para mantener stock confiable.',
      why: 'Garantiza visibilidad de café e insumos en bodega.',
      when: 'Tras liquidar compras o al ajustar existencias.',
      after: 'Los movimientos quedan registrados y disponibles en reportes.',
      nextStep: { label: 'Ver movimientos', to: '/inventario/movimientos' },
    },
  },
  {
    pattern: /^\/compras(\/|$)/,
    experience: {
      description: 'Gestione compras de café desde recepción hasta liquidación.',
      help: 'Siga el flujo: recepción → pesaje → calidad → liquidación.',
      why: 'Es el proceso operativo central de la cooperativa cafetera.',
      when: 'Cuando llega café o hay tickets abiertos.',
      after: 'El ticket cambia de estado y aparece en Mi día si falta acción.',
      nextStep: { label: 'Registrar recepción', to: '/compras/recepcion' },
    },
  },
  {
    pattern: /^\/comercial(\/|$)/,
    experience: {
      description: 'Administre ventas, clientes, pedidos y facturación.',
      help: 'Comience por clientes o pedidos según su proceso comercial.',
      why: 'Cierra el ciclo desde inventario hacia el cliente.',
      when: 'Al gestionar pedidos o facturación.',
      after: 'El pedido avanza a despacho o facturación.',
      nextStep: { label: 'Ver pedidos', to: '/comercial/pedidos' },
    },
  },
  {
    pattern: /^\/cadena-suministro(\/|$)/,
    experience: {
      description: 'Planifique abastecimiento, almacén y transporte.',
      help: 'Coordine demanda, inventario y entregas en un solo lugar.',
      why: 'Alinea oferta y demanda logística.',
      when: 'En planificación de abastecimiento o despachos.',
      after: 'Genere órdenes o movimientos asociados.',
      nextStep: { label: 'Centro de suministro', to: '/cadena-suministro' },
    },
  },
  {
    pattern: /^\/manufactura(\/|$)/,
    experience: {
      description: 'Supervise producción, calidad y recursos de planta.',
      help: 'Los tableros muestran eficiencia y órdenes en curso.',
      why: 'Controla la transformación de materia prima.',
      when: 'Durante la jornada de planta.',
      after: 'Actualice órdenes y registre calidad.',
      nextStep: { label: 'Centro de manufactura', to: '/manufactura' },
    },
  },
  {
    pattern: /^\/rrhh(\/|$)|^\/portal(\/|$)/,
    experience: {
      description: 'Gestione personal, nómina, asistencia y portal del empleado.',
      help: 'Cada sección cubre un proceso de talento humano.',
      why: 'Administra el ciclo de vida del colaborador.',
      when: 'En altas, nómina o consultas del empleado.',
      after: 'Los cambios quedan reflejados en el expediente.',
      nextStep: { label: 'Centro de personal', to: '/rrhh' },
    },
  },
  {
    pattern: /^\/finanzas(\/|$)/,
    experience: {
      description: 'Controle contabilidad, pagos, tesorería y presupuesto.',
      help: 'Los reportes financieros se generan desde cada submódulo.',
      why: 'Da control financiero a la organización.',
      when: 'En cierres, pagos o consultas de presupuesto.',
      after: 'Consulte reportes o asientos generados.',
      nextStep: { label: 'Centro financiero', to: '/finanzas' },
    },
  },
  {
    pattern: /^\/bi(\/|$)/,
    experience: {
      description: 'Consulte indicadores, tableros y reportes de negocio.',
      help: 'Filtre por período y exporte cuando necesite compartir resultados.',
      why: 'Convierte la operación en decisión informada.',
      when: 'En análisis periódicos o seguimiento de metas.',
      after: 'Exporte o comparta el reporte con gerencia.',
      nextStep: { label: 'Ver reportes', to: '/bi/reportes' },
    },
  },
  {
    pattern: /^\/iam(\/|$)|^\/administracion(\/|$)/,
    experience: {
      description: 'Configure usuarios, roles, permisos y políticas de seguridad.',
      help: 'Asigne roles antes de invitar usuarios nuevos al sistema.',
      why: 'Controla quién puede ver y hacer cada acción.',
      when: 'Al incorporar personal o ajustar accesos.',
      after: 'El usuario podrá entrar con el perfil asignado.',
      nextStep: { label: 'Gestionar usuarios', to: '/administracion/usuarios' },
    },
  },
  {
    pattern: /^\/gestion-activos(\/|$)/,
    experience: {
      description: 'Administre activos fijos y mantenimiento preventivo.',
      help: 'Registre equipos y programe órdenes de trabajo.',
      why: 'Protege la continuidad de activos críticos.',
      when: 'Al dar de alta equipos o programar mantenimiento.',
      after: 'Queda historial y próximas órdenes.',
      nextStep: { label: 'Ver activos', to: '/gestion-activos' },
    },
  },
  {
    pattern: /^\/plataforma-agritech(\/|$)/,
    experience: {
      description: 'Herramientas avanzadas de agricultura de precisión y trazabilidad.',
      help: 'Explore cultivos, riego, sanidad y cumplimiento según su operación.',
      why: 'Extiende el ERP a agronomía avanzada.',
      when: 'Cuando el paquete incluya agritech.',
      after: 'Registre lecturas o consulte mapas asociados.',
      nextStep: { label: 'Plataforma agrícola', to: '/plataforma-agritech' },
    },
  },
  {
    pattern: /^\/integraciones(\/|$)|^\/plataforma-empresarial\/eip(\/|$)|^\/apis(\/|$)/,
    experience: {
      description: 'Conecte AgroERP con sistemas externos y servicios.',
      help: 'Revise el estado de conectores y errores de sincronización.',
      why: 'Evita doble digitación y mantiene datos alineados.',
      when: 'Al configurar balanzas, ERPs o servicios externos.',
      after: 'Verifique sincronizaciones y alertas de fallo.',
      nextStep: { label: 'Centro de integraciones', to: '/integraciones' },
    },
  },
  {
    pattern: /^\/gis(\/|$)/,
    experience: {
      description: 'Visualice fincas, lotes y capas geográficas en mapa.',
      help: 'Importe capas o consulte ubicaciones registradas.',
      why: 'Da contexto territorial a la operación.',
      when: 'Al ubicar predios o revisar cobertura.',
      after: 'Actualice geometrías o vuelva al expediente de finca.',
      nextStep: { label: 'Abrir mapa', to: '/gis/mapa' },
    },
  },
  {
    pattern: /^\/record-explorer\//,
    experience: {
      description: 'Vista integral del registro: historial, documentos y análisis.',
      help: 'Navegue por pestañas para ver toda la información relacionada.',
      why: 'Evita saltar entre pantallas para entender un registro.',
      when: 'Al investigar un productor, finca o documento en profundidad.',
      after: 'Tome la acción recomendada desde el expediente.',
    },
  },
  {
    pattern: /^\/notificaciones(\/|$)/,
    experience: {
      description: 'Centro de avisos agrupados por operación, procesos, sistema e implementación.',
      help: 'Filtre por categoría y atienda lo importante primero.',
      why: 'Evita una bandeja plana sin contexto.',
      when: 'Al recibir avisos o al cerrar el día.',
      after: 'Marque leída, atienda o archive según corresponda.',
      nextStep: { label: 'Abrir notificaciones', to: '/notificaciones' },
    },
  },
  {
    pattern: /^\/tareas(\/|$)/,
    experience: {
      description: 'Tareas programadas y trabajos en segundo plano.',
      help: 'Consulte el calendario para ver próximas ejecuciones.',
      why: 'Hace visibles trabajos automáticos del sistema.',
      when: 'Al monitorear jobs o fallos de ejecución.',
      after: 'Reintente o revise el detalle del job.',
      nextStep: { label: 'Calendario de tareas', to: '/tareas/calendario' },
    },
  },
  {
    pattern: /^\/documentos(\/|$)/,
    experience: {
      description: 'Archivos y documentos compartidos de la organización.',
      help: 'Suba archivos y organícelos por carpeta o etiqueta. Revise los que requieren firma.',
      why: 'Centraliza evidencias y documentos de compra/proceso.',
      when: 'Al adjuntar, firmar o consultar un documento.',
      after: 'El documento queda disponible en el expediente relacionado.',
    },
  },
  {
    pattern: /^\/reglas(\/|$)/,
    experience: {
      description: 'Defina reglas de negocio y decisiones automatizadas.',
      help: 'Simule reglas antes de activarlas en producción.',
      why: 'Estandariza decisiones repetibles.',
      when: 'Al configurar políticas de precio, calidad o aprobación.',
      after: 'Active la regla y monitoree resultados.',
      nextStep: { label: 'Simulador de reglas', to: '/reglas/simulador' },
    },
  },
  {
    pattern: /^\/ia(\/|$)/,
    experience: {
      description: 'Asistente inteligente para consultas y resúmenes.',
      help: 'Formule preguntas en lenguaje natural sobre su operación.',
      why: 'Acelera consultas sin navegar múltiples pantallas.',
      when: 'Al necesitar un resumen rápido o una búsqueda guiada.',
      after: 'Abra el registro o reporte sugerido.',
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
