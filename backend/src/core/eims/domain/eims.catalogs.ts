export const EIMS_CATALOG_KEYS = [
  'item_type',
  'category',
  'subcategory',
  'brand',
  'presentation',
  'uom',
  'item_status',
  'adjustment_reason',
  'loss_reason',
  'movement_type',
  'storage_type',
  'lot_type',
  'location_type',
  'warehouse_type',
] as const;

export type EimsCatalogKey = (typeof EIMS_CATALOG_KEYS)[number];

export const EIMS_ITEM_TYPES = [
  { entryKey: 'coffee_parchment', name: 'Café pergamino', code: 'CAF-PER' },
  { entryKey: 'coffee_green', name: 'Café verde', code: 'CAF-VER' },
  { entryKey: 'coffee_roasted', name: 'Café tostado', code: 'CAF-TOS' },
  { entryKey: 'coffee_ground', name: 'Café molido', code: 'CAF-MOL' },
  { entryKey: 'agri_input', name: 'Insumos agrícolas', code: 'INS-AGR' },
  { entryKey: 'fertilizer', name: 'Fertilizantes', code: 'FER' },
  { entryKey: 'agrochemical', name: 'Agroquímicos', code: 'AGQ' },
  { entryKey: 'tool', name: 'Herramientas', code: 'HER' },
  { entryKey: 'equipment', name: 'Equipos', code: 'EQP' },
  { entryKey: 'spare_part', name: 'Repuestos', code: 'REP' },
  { entryKey: 'fixed_asset', name: 'Activos fijos', code: 'ACT' },
  { entryKey: 'office_supply', name: 'Material de oficina', code: 'OFI' },
  { entryKey: 'packaging', name: 'Empaques', code: 'EMP' },
  { entryKey: 'fuel', name: 'Combustibles', code: 'COM' },
  { entryKey: 'finished_good', name: 'Productos terminados', code: 'PT' },
  { entryKey: 'raw_material', name: 'Materias primas', code: 'MP' },
  { entryKey: 'other', name: 'Otros', code: 'OTR' },
] as const;

export const EIMS_WAREHOUSE_TYPES = [
  { entryKey: 'warehouse', name: 'Bodega' },
  { entryKey: 'distribution_center', name: 'Centro de distribución' },
  { entryKey: 'collection_center', name: 'Centro de acopio' },
  { entryKey: 'store', name: 'Almacén' },
  { entryKey: 'silo', name: 'Silo' },
  { entryKey: 'yard', name: 'Patio' },
  { entryKey: 'cold_room', name: 'Cuarto frío' },
] as const;

export const EIMS_LOCATION_TYPES = [
  { entryKey: 'internal', name: 'Ubicación interna' },
  { entryKey: 'aisle', name: 'Pasillo' },
  { entryKey: 'shelf', name: 'Estantería' },
  { entryKey: 'level', name: 'Nivel' },
  { entryKey: 'position', name: 'Posición' },
] as const;

export const EIMS_DEFAULT_UOMS = [
  { entryKey: 'kg', name: 'Kilogramo', code: 'KG' },
  { entryKey: 'g', name: 'Gramo', code: 'G' },
  { entryKey: 'lb', name: 'Libra', code: 'LB' },
  { entryKey: 'unit', name: 'Unidad', code: 'UND' },
  { entryKey: 'bag', name: 'Saco', code: 'SAC' },
  { entryKey: 'box', name: 'Caja', code: 'CAJ' },
  { entryKey: 'l', name: 'Litro', code: 'L' },
  { entryKey: 'ml', name: 'Mililitro', code: 'ML' },
  { entryKey: 'm', name: 'Metro', code: 'M' },
] as const;

export const EIMS_DEFAULT_STATUSES = [
  { entryKey: 'active', name: 'Activo' },
  { entryKey: 'inactive', name: 'Inactivo' },
  { entryKey: 'blocked', name: 'Bloqueado' },
  { entryKey: 'discontinued', name: 'Descontinuado' },
] as const;

export const EIMS_MOVEMENT_TYPES = [
  { entryKey: 'entry', name: 'Entrada' },
  { entryKey: 'exit', name: 'Salida' },
  { entryKey: 'transfer', name: 'Traslado' },
  { entryKey: 'adjustment_positive', name: 'Ajuste positivo' },
  { entryKey: 'adjustment_negative', name: 'Ajuste negativo' },
  { entryKey: 'reservation', name: 'Reserva' },
  { entryKey: 'release', name: 'Liberación de reserva' },
  { entryKey: 'block', name: 'Bloqueo' },
  { entryKey: 'unblock', name: 'Desbloqueo' },
  { entryKey: 'transformation', name: 'Transformación' },
  { entryKey: 'consumption', name: 'Consumo' },
  { entryKey: 'production', name: 'Producción' },
  { entryKey: 'return', name: 'Devolución' },
  { entryKey: 'shrinkage', name: 'Merma' },
  { entryKey: 'loss', name: 'Pérdida' },
  { entryKey: 'donation', name: 'Donación' },
  { entryKey: 'intercompany_transfer', name: 'Transferencia entre empresas' },
] as const;

export const EIMS_ADJUSTMENT_REASONS = [
  { entryKey: 'count_diff', name: 'Diferencia de conteo' },
  { entryKey: 'damage', name: 'Daño' },
  { entryKey: 'expiry', name: 'Vencimiento' },
  { entryKey: 'correction', name: 'Corrección' },
] as const;

export const EIMS_LOSS_REASONS = [
  { entryKey: 'theft', name: 'Hurto' },
  { entryKey: 'spoilage', name: 'Merma' },
  { entryKey: 'accident', name: 'Accidente' },
  { entryKey: 'unknown', name: 'Desconocido' },
] as const;

export const EIMS_PARAMETER_KEYS = [
  'allow_negative_stock',
  'enable_reservations',
  'lot_control_default',
  'serial_control_default',
  'expiry_control_default',
  'valuation_method',
  'fifo_policy',
  'lifo_policy',
  'average_cost_policy',
  'specific_cost_policy',
] as const;

export const EIMS_DEFAULT_PARAMETERS: Array<{
  parameterKey: string;
  name: string;
  value: Record<string, unknown>;
}> = [
  { parameterKey: 'allow_negative_stock', name: 'Inventario negativo', value: { enabled: false } },
  { parameterKey: 'enable_reservations', name: 'Inventario reservado', value: { enabled: true } },
  { parameterKey: 'lot_control_default', name: 'Control por lote por defecto', value: { enabled: true } },
  { parameterKey: 'serial_control_default', name: 'Control por serie por defecto', value: { enabled: false } },
  { parameterKey: 'expiry_control_default', name: 'Control por vencimiento por defecto', value: { enabled: false } },
  { parameterKey: 'lot_block_on_expiry', name: 'Bloqueo automático por vencimiento', value: { enabled: true } },
  { parameterKey: 'expiry_alert_days', name: 'Días de alerta de vencimiento', value: { days: [60, 30, 7] } },
  { parameterKey: 'count_default_tolerance_qty_pct', name: 'Tolerancia cantidad conteo %', value: { pct: 0 } },
  { parameterKey: 'count_default_approval_levels', name: 'Niveles de aprobación de ajustes', value: { levels: 1 } },
  { parameterKey: 'count_require_second', name: 'Segundo conteo obligatorio', value: { enabled: true } },
  { parameterKey: 'supply_auto_suggestions', name: 'Generación automática de sugerencias', value: { enabled: true } },
  { parameterKey: 'supply_default_lead_time_days', name: 'Lead time abastecimiento (días)', value: { days: 7 } },
  { parameterKey: 'supply_reservation_expiry_hours', name: 'Vencimiento reservas temporales (horas)', value: { hours: 72 } },
  { parameterKey: 'planning_forecast_horizon_days', name: 'Horizonte pronóstico (días)', value: { days: 90 } },
  { parameterKey: 'planning_dead_stock_days', name: 'Días inventario inmovilizado', value: { days: 90 } },
  { parameterKey: 'ops_snapshot_retention_days', name: 'Retención snapshots ops (días)', value: { days: 90 } },
  { parameterKey: 'ops_alert_saturation_pct', name: 'Umbral saturación bodega %', value: { pct: 90 } },
  { parameterKey: 'valuation_method', name: 'Método de valoración', value: { method: 'average' } },
  { parameterKey: 'fifo_policy', name: 'Política FIFO', value: { enabled: true, priority: 1 } },
  { parameterKey: 'lifo_policy', name: 'Política LIFO', value: { enabled: false, priority: 2 } },
  { parameterKey: 'average_cost_policy', name: 'Costo promedio', value: { enabled: true } },
  { parameterKey: 'specific_cost_policy', name: 'Costo específico', value: { enabled: false } },
];

export function generateItemCodes(itemKey: string) {
  const clean = itemKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20);
  return {
    qrCode: `EIMS:${itemKey}`,
    barcode: clean.padEnd(8, '0').slice(0, 20),
  };
}

export function generateLocationKey(parts: {
  warehouseKey: string;
  aisle?: string;
  shelf?: string;
  level?: string;
  position?: string;
}): string {
  return [parts.warehouseKey, parts.aisle, parts.shelf, parts.level, parts.position]
    .filter(Boolean)
    .join('-')
    .toUpperCase();
}
