export type ValuationMethod = 'average' | 'fifo' | 'lifo' | 'specific';

export interface CostLayerSnapshot {
  id?: string;
  layerKey: string;
  remainingQty: number;
  unitCost: number;
  receivedAt: Date;
  lotKey?: string | null;
}

export interface ValuationResult {
  unitCost: number;
  totalCost: number;
  averageCost: number;
  balanceQty: number;
  balanceCost: number;
  method: ValuationMethod;
  layersConsumed: Array<{ layerKey: string; qty: number; unitCost: number }>;
}

export function resolveValuationMethod(
  itemMethod?: string | null,
  orgDefault?: string | null,
): ValuationMethod {
  const method = (itemMethod || orgDefault || 'average') as ValuationMethod;
  if (['average', 'fifo', 'lifo', 'specific'].includes(method)) return method;
  return 'average';
}

export function computeWeightedAverage(
  previousQty: number,
  previousCost: number,
  entryQty: number,
  entryUnitCost: number,
): { averageCost: number; balanceCost: number; balanceQty: number } {
  const balanceQty = previousQty + entryQty;
  const balanceCost = previousCost + entryQty * entryUnitCost;
  return {
    balanceQty,
    balanceCost,
    averageCost: balanceQty > 0 ? Number((balanceCost / balanceQty).toFixed(6)) : entryUnitCost,
  };
}

export function consumeLayers(
  layers: CostLayerSnapshot[],
  qty: number,
  method: 'fifo' | 'lifo',
): { unitCost: number; totalCost: number; layersConsumed: Array<{ layerKey: string; qty: number; unitCost: number }>; remainingLayers: CostLayerSnapshot[] } {
  const ordered =
    method === 'fifo'
      ? [...layers].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())
      : [...layers].sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

  let remaining = qty;
  let totalCost = 0;
  const layersConsumed: Array<{ layerKey: string; qty: number; unitCost: number }> = [];
  const remainingLayers: CostLayerSnapshot[] = [];

  for (const layer of ordered) {
    if (remaining <= 0) {
      remainingLayers.push(layer);
      continue;
    }
    const take = Math.min(layer.remainingQty, remaining);
    if (take > 0) {
      layersConsumed.push({ layerKey: layer.layerKey, qty: take, unitCost: layer.unitCost });
      totalCost += take * layer.unitCost;
      remaining -= take;
    }
    const left = layer.remainingQty - take;
    if (left > 0.0000001) {
      remainingLayers.push({ ...layer, remainingQty: Number(left.toFixed(6)) });
    }
  }

  const consumedQty = qty - remaining;
  return {
    unitCost: consumedQty > 0 ? Number((totalCost / consumedQty).toFixed(6)) : 0,
    totalCost: Number(totalCost.toFixed(6)),
    layersConsumed,
    remainingLayers,
  };
}

export function specificCostFromLot(lotUnitCost: number, qty: number): ValuationResult {
  return {
    unitCost: lotUnitCost,
    totalCost: Number((lotUnitCost * qty).toFixed(6)),
    averageCost: lotUnitCost,
    balanceQty: 0,
    balanceCost: 0,
    method: 'specific',
    layersConsumed: [],
  };
}

export function buildKardexLine(input: {
  previousBalanceQty: number;
  previousBalanceCost: number;
  entryQty: number;
  exitQty: number;
  movementUnitCost: number;
  valuationMethod: ValuationMethod;
}): {
  balanceQty: number;
  balanceCost: number;
  averageCost: number;
  unitCost: number;
  totalCost: number;
} {
  const balanceQty = Number((input.previousBalanceQty + input.entryQty - input.exitQty).toFixed(6));
  let balanceCost = input.previousBalanceCost;
  let unitCost = input.movementUnitCost;

  if (input.entryQty > 0) {
    balanceCost = Number((input.previousBalanceCost + input.entryQty * input.movementUnitCost).toFixed(6));
  } else if (input.exitQty > 0) {
    const avg = input.previousBalanceQty > 0 ? input.previousBalanceCost / input.previousBalanceQty : input.movementUnitCost;
    unitCost = input.valuationMethod === 'average' ? avg : input.movementUnitCost;
    balanceCost = Number(Math.max(0, input.previousBalanceCost - input.exitQty * unitCost).toFixed(6));
  }

  const averageCost = balanceQty > 0 ? Number((balanceCost / balanceQty).toFixed(6)) : 0;
  const totalCost = Number(((input.entryQty > 0 ? input.entryQty : input.exitQty) * unitCost).toFixed(6));

  return { balanceQty, balanceCost, averageCost, unitCost, totalCost };
}

export function periodBounds(periodType: 'daily' | 'monthly' | 'yearly', ref = new Date()): {
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
} {
  const start = new Date(ref);
  const end = new Date(ref);
  if (periodType === 'daily') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { periodKey: `D-${start.toISOString().slice(0, 10)}`, periodStart: start, periodEnd: end };
  }
  if (periodType === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { periodKey: `M-${start.toISOString().slice(0, 7)}`, periodStart: start, periodEnd: end };
  }
  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  end.setMonth(11, 31);
  end.setHours(23, 59, 59, 999);
  return { periodKey: `Y-${start.getFullYear()}`, periodStart: start, periodEnd: end };
}

export function compareValuationMethods(input: {
  previousQty: number;
  previousCost: number;
  entryQty: number;
  entryUnitCost: number;
  exitQty: number;
  layers: CostLayerSnapshot[];
}): Record<ValuationMethod, { exitUnitCost: number; exitTotalCost: number; balanceCost: number }> {
  const avg = computeWeightedAverage(input.previousQty, input.previousCost, input.entryQty, input.entryUnitCost);
  const avgExitUnit = avg.balanceQty > 0 ? avg.averageCost : input.entryUnitCost;
  const layersAfterEntry =
    input.entryQty > 0
      ? [
          ...input.layers,
          {
            layerKey: 'sim-entry',
            remainingQty: input.entryQty,
            unitCost: input.entryUnitCost,
            receivedAt: new Date(),
          },
        ]
      : input.layers;

  const fifo = consumeLayers(layersAfterEntry, input.exitQty, 'fifo');
  const lifo = consumeLayers(layersAfterEntry, input.exitQty, 'lifo');
  const specificUnit = input.layers[0]?.unitCost ?? input.entryUnitCost;

  return {
    average: {
      exitUnitCost: avgExitUnit,
      exitTotalCost: Number((avgExitUnit * input.exitQty).toFixed(6)),
      balanceCost: Number((avg.balanceCost - avgExitUnit * input.exitQty).toFixed(6)),
    },
    fifo: {
      exitUnitCost: fifo.unitCost,
      exitTotalCost: fifo.totalCost,
      balanceCost: Number(
        (layersAfterEntry.reduce((s, l) => s + l.remainingQty * l.unitCost, 0) - fifo.totalCost).toFixed(6),
      ),
    },
    lifo: {
      exitUnitCost: lifo.unitCost,
      exitTotalCost: lifo.totalCost,
      balanceCost: Number(
        (layersAfterEntry.reduce((s, l) => s + l.remainingQty * l.unitCost, 0) - lifo.totalCost).toFixed(6),
      ),
    },
    specific: {
      exitUnitCost: specificUnit,
      exitTotalCost: Number((specificUnit * input.exitQty).toFixed(6)),
      balanceCost: Number((input.previousCost + input.entryQty * input.entryUnitCost - specificUnit * input.exitQty).toFixed(6)),
    },
  };
}
