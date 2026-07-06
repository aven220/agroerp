export type GateCheck = {
  code: string;
  ok: boolean;
  severity: 'info' | 'warning' | 'blocking';
  message: string;
};

export function evaluateGateChecks(input: {
  producerActive: boolean;
  documentsValid: boolean;
  farmActive: boolean;
  lotAuthorized: boolean;
  withinDailyLimits: boolean;
  qualityRestricted: boolean;
  hasActiveContract: boolean;
  hasSanctions: boolean;
  alerts: string[];
}): { allowed: boolean; checks: GateCheck[] } {
  const checks: GateCheck[] = [
    {
      code: 'producer_active',
      ok: input.producerActive,
      severity: 'blocking',
      message: input.producerActive ? 'Productor activo' : 'Productor inactivo o bloqueado',
    },
    {
      code: 'documents_valid',
      ok: input.documentsValid,
      severity: 'blocking',
      message: input.documentsValid ? 'Documentación vigente' : 'Documentación vencida o incompleta',
    },
    {
      code: 'farm_active',
      ok: input.farmActive,
      severity: 'blocking',
      message: input.farmActive ? 'Finca activa' : 'Finca inactiva o no autorizada',
    },
    {
      code: 'lot_authorized',
      ok: input.lotAuthorized,
      severity: 'blocking',
      message: input.lotAuthorized ? 'Lote autorizado' : 'Lote no autorizado para entrega',
    },
    {
      code: 'daily_limits',
      ok: input.withinDailyLimits,
      severity: 'blocking',
      message: input.withinDailyLimits ? 'Dentro de límites diarios' : 'Límite diario de entrega superado',
    },
    {
      code: 'quality_restrictions',
      ok: !input.qualityRestricted,
      severity: 'warning',
      message: input.qualityRestricted ? 'Restricciones de calidad activas' : 'Sin restricciones de calidad',
    },
    {
      code: 'active_contract',
      ok: input.hasActiveContract,
      severity: 'warning',
      message: input.hasActiveContract ? 'Contrato vigente' : 'Sin contrato vigente',
    },
    {
      code: 'sanctions',
      ok: !input.hasSanctions,
      severity: 'blocking',
      message: input.hasSanctions ? 'Productor con sanciones activas' : 'Sin sanciones',
    },
  ];

  for (const alert of input.alerts) {
    checks.push({
      code: 'alert',
      ok: false,
      severity: 'warning',
      message: alert,
    });
  }

  const allowed = checks.filter((c) => c.severity === 'blocking').every((c) => c.ok);
  return { allowed, checks };
}
