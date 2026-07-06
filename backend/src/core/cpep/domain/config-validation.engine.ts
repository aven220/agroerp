export type ReceptionContext = {
  now?: Date;
  purchaseCenterId?: string;
  producerId?: string;
  coffeeTypeKey?: string;
  seasonKey?: string;
  humidityPct?: number;
  factor?: number;
  qualityScore?: number;
  ticketsToday?: number;
  kgToday?: number;
};

export type ReceptionRuleLike = {
  purchaseCenterId?: string | null;
  producerId?: string | null;
  coffeeTypeKey?: string | null;
  seasonKey?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  maxTicketsDay?: number | null;
  maxKgDay?: number | null;
  minHumidityPct?: number | null;
  maxHumidityPct?: number | null;
  minFactor?: number | null;
  maxFactor?: number | null;
  minQualityScore?: number | null;
  maxQualityScore?: number | null;
  isActive?: boolean;
};

export function isWithinSchedule(openTime?: string | null, closeTime?: string | null, now = new Date()): boolean {
  if (!openTime || !closeTime) return true;
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const open = oh * 60 + (om || 0);
  const close = ch * 60 + (cm || 0);
  if (open <= close) return minutes >= open && minutes <= close;
  return minutes >= open || minutes <= close;
}

export function validateReceptionRules(rules: ReceptionRuleLike[], ctx: ReceptionContext): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const now = ctx.now ?? new Date();
  const applicable = rules.filter((r) => r.isActive !== false).filter((r) => {
    if (r.purchaseCenterId && ctx.purchaseCenterId && r.purchaseCenterId !== ctx.purchaseCenterId) return false;
    if (r.producerId && ctx.producerId && r.producerId !== ctx.producerId) return false;
    if (r.coffeeTypeKey && ctx.coffeeTypeKey && r.coffeeTypeKey !== ctx.coffeeTypeKey) return false;
    if (r.seasonKey && ctx.seasonKey && r.seasonKey !== ctx.seasonKey) return false;
    return true;
  });

  for (const rule of applicable) {
    if (!isWithinSchedule(rule.openTime, rule.closeTime, now)) {
      violations.push(`Fuera de horario de recepción (${rule.openTime}-${rule.closeTime})`);
    }
    if (rule.maxTicketsDay != null && (ctx.ticketsToday ?? 0) >= rule.maxTicketsDay) {
      violations.push(`Límite diario de tickets alcanzado (${rule.maxTicketsDay})`);
    }
    if (rule.maxKgDay != null && (ctx.kgToday ?? 0) >= rule.maxKgDay) {
      violations.push(`Límite diario de kg alcanzado (${rule.maxKgDay})`);
    }
    if (ctx.humidityPct != null) {
      if (rule.minHumidityPct != null && ctx.humidityPct < rule.minHumidityPct) {
        violations.push(`Humedad ${ctx.humidityPct}% bajo mínimo ${rule.minHumidityPct}%`);
      }
      if (rule.maxHumidityPct != null && ctx.humidityPct > rule.maxHumidityPct) {
        violations.push(`Humedad ${ctx.humidityPct}% sobre máximo ${rule.maxHumidityPct}%`);
      }
    }
    if (ctx.factor != null) {
      if (rule.minFactor != null && ctx.factor < rule.minFactor) {
        violations.push(`Factor ${ctx.factor} bajo mínimo ${rule.minFactor}`);
      }
      if (rule.maxFactor != null && ctx.factor > rule.maxFactor) {
        violations.push(`Factor ${ctx.factor} sobre máximo ${rule.maxFactor}`);
      }
    }
    if (ctx.qualityScore != null) {
      if (rule.minQualityScore != null && ctx.qualityScore < rule.minQualityScore) {
        violations.push(`Calidad ${ctx.qualityScore} bajo mínimo ${rule.minQualityScore}`);
      }
      if (rule.maxQualityScore != null && ctx.qualityScore > rule.maxQualityScore) {
        violations.push(`Calidad ${ctx.qualityScore} sobre máximo ${rule.maxQualityScore}`);
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

export function applyAutoAdjustments(
  bonuses: Array<{ code: string; amount: number; condition?: Record<string, unknown> }>,
  penalties: Array<{ code: string; amount: number; condition?: Record<string, unknown> }>,
  ctx: { humidityPct?: number; factor?: number; grade?: string },
): { bonusTotal: number; penaltyTotal: number; applied: string[] } {
  const applied: string[] = [];
  let bonusTotal = 0;
  let penaltyTotal = 0;

  for (const b of bonuses) {
    const cond = b.condition ?? {};
    if (cond.grade && cond.grade !== ctx.grade) continue;
    if (cond.minFactor != null && (ctx.factor ?? 0) < Number(cond.minFactor)) continue;
    bonusTotal += b.amount;
    applied.push(`bonus:${b.code}`);
  }
  for (const p of penalties) {
    const cond = p.condition ?? {};
    if (cond.maxHumidity != null && (ctx.humidityPct ?? 0) <= Number(cond.maxHumidity)) continue;
    if (cond.maxFactor != null && (ctx.factor ?? 100) >= Number(cond.maxFactor)) continue;
    penaltyTotal += p.amount;
    applied.push(`penalty:${p.code}`);
  }
  return { bonusTotal, penaltyTotal, applied };
}
