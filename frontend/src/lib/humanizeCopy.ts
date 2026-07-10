/**
 * EPA-02 — Sustitución de jerga técnica visible para el usuario final.
 */

const TERM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bRecord Explorer\b/gi, 'Expediente 360°'],
  [/\bDigital Twin\b/gi, 'Vista integral'],
  [/\bUCEM\b/g, 'Centro de datos'],
  [/\bEIAMP\b/g, 'Seguridad'],
  [/\bEIMS\b/g, 'Inventario'],
  [/\bCPEP\b/g, 'Compras de café'],
  [/\bESCM\b/g, 'Comercial'],
  [/\bEMFG\b/g, 'Manufactura'],
  [/\bHCM\b/g, 'Recursos humanos'],
  [/\bSCM\b/g, 'Cadena de suministro'],
  [/\bWMS\b/g, 'Almacén'],
  [/\bTMS\b/g, 'Transporte'],
  [/\bCMMS\b/g, 'Mantenimiento'],
  [/\bEAM\b/g, 'Activos'],
  [/\bQMS\b/g, 'Calidad'],
  [/\bMES\b/g, 'Planta'],
  [/\bBPMS\b/g, 'Procesos automatizados'],
  [/\bBPMN\b/g, 'flujo visual'],
  [/\bPRM\b/g, 'Productores'],
  [/\bFTIP\b/g, 'Fincas'],
  [/\bFMDT\b/g, 'Lotes'],
  [/\bEACE\b/g, 'Ecosistema colaborativo'],
  [/\bEIP\b/g, 'Integraciones'],
  [/\bEATR\b/g, 'Trazabilidad'],
  [/\bEATP\b/g, 'Plataforma agrícola'],
  [/\bEGSIP\b/g, 'Mapas'],
  [/\bIAM\b/g, 'Usuarios y accesos'],
  [/\bOps Center\b/gi, 'Centro de operaciones'],
  [/\bOperations Center\b/gi, 'Centro de operaciones'],
  [/\bWorkflow Instance\b/gi, 'Trámite'],
  [/\bWorkflow\b/gi, 'Procesos'],
  [/\binventory_posted\b/g, 'En inventario'],
  [/\barrived\b/gi, 'Recibido'],
  [/\bbootstrap\b/gi, 'configuración inicial'],
  [/\bworkflowKey\b/g, 'código de proceso'],
  [/\bstateKey\b/g, 'paso actual'],
  [/\btransitionKey\b/g, 'acción'],
  [/\bmetadata\b/gi, 'información adicional'],
  [/\bschema\b/gi, 'estructura'],
  [/\bpayload\b/gi, 'datos enviados'],
  [/\buuid\b/gi, 'identificador'],
  [/\bslug\b/gi, 'identificador interno'],
  [/\bjson\b/gi, 'archivo de datos'],
  [/\bDTO\b/g, 'registro'],
  [/\bESB\b/g, 'bus de integración'],
  [/\bBRE\b/g, 'reglas de negocio'],
  [/\bEBRE\b/g, 'motor de reglas'],
  [/\bUOM\b/g, 'unidad de medida'],
  [/\bFIFO\/LIFO\b/g, 'método de rotación'],
  [/\bSprint \d+ —? ?/gi, ''],
  [/\bbridge\b/gi, 'vinculación'],
  [/\bDrag & Drop\b/gi, 'arrastrar y soltar'],
  [/\bSin datos\b/g, 'Aún no hay información'],
  [/\bLista vacía\b/gi, 'Aún no hay registros'],
  [/\b0 registros\b/gi, 'Sin registros aún'],
  [/\bSin pendientes\b/g, 'Todo al día'],
  [/\bSembrar catálogos\b/gi, 'Cargar configuración inicial'],
  [/\bSembrar\b/gi, 'Cargar configuración inicial'],
];

/** Aplica sustituciones de lenguaje empresarial a un texto visible */
export function humanizeCopy(text: string): string {
  let result = text;
  for (const [pattern, replacement] of TERM_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result.replace(/\s{2,}/g, ' ').trim();
}

/** Etiqueta legible para pasos de workflow / estados de ticket */
export function labelWorkflowStep(stateKey: string): string {
  const known: Record<string, string> = {
    draft: 'Borrador',
    in_progress: 'En progreso',
    review: 'En revisión',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    completed: 'Completado',
    cancelled: 'Cancelado',
    pending: 'Pendiente',
    arrived: 'Recibido',
    queued: 'En espera',
    receiving: 'En recepción',
    identity_validated: 'Identidad confirmada',
    weighed: 'Pesado',
    quality_pending: 'Pendiente de calidad',
    quality_approved: 'Aprobado en calidad',
    quality_rejected: 'Rechazado en calidad',
    settled: 'Liquidado',
    inventory_posted: 'En inventario',
  };
  return known[stateKey] ?? humanizeCopy(stateKey.replace(/_/g, ' '));
}
