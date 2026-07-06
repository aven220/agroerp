export const ESCM_CATALOG_KEYS = [
  'customer_type',
  'segment',
  'sales_channel',
  'currency',
  'payment_term',
  'delivery_method',
  'incoterm',
  'tax',
  'withholding',
  'discount_type',
  'promotion_type',
  'region',
  'season',
  'classification',
] as const;

export const ESCM_CUSTOMER_TYPES = [
  { entryKey: 'individual', name: 'Persona natural', code: 'IND' },
  { entryKey: 'company', name: 'Empresa', code: 'EMP' },
  { entryKey: 'cooperative', name: 'Cooperativa', code: 'COOP' },
  { entryKey: 'exporter', name: 'Exportador', code: 'EXP' },
  { entryKey: 'distributor', name: 'Distribuidor', code: 'DIST' },
  { entryKey: 'wholesaler', name: 'Mayorista', code: 'MAY' },
  { entryKey: 'retailer', name: 'Minorista', code: 'MIN' },
  { entryKey: 'international', name: 'Internacional', code: 'INT' },
] as const;

export const ESCM_SEGMENTS = [
  { entryKey: 'premium', name: 'Premium' },
  { entryKey: 'standard', name: 'Estándar' },
  { entryKey: 'volume', name: 'Alto volumen' },
  { entryKey: 'strategic', name: 'Estratégico' },
  { entryKey: 'prospect', name: 'Prospecto' },
] as const;

export const ESCM_CHANNELS = [
  { entryKey: 'direct', name: 'Venta directa' },
  { entryKey: 'distributor', name: 'Distribuidor' },
  { entryKey: 'export', name: 'Exportación' },
  { entryKey: 'ecommerce', name: 'E-commerce' },
  { entryKey: 'field', name: 'Fuerza de ventas' },
] as const;

export const ESCM_CURRENCIES = [
  { entryKey: 'COP', name: 'Peso colombiano', code: 'COP' },
  { entryKey: 'USD', name: 'Dólar estadounidense', code: 'USD' },
  { entryKey: 'EUR', name: 'Euro', code: 'EUR' },
] as const;

export const ESCM_PAYMENT_TERMS = [
  { entryKey: 'cash', name: 'Contado' },
  { entryKey: 'net_15', name: 'Neto 15 días' },
  { entryKey: 'net_30', name: 'Neto 30 días' },
  { entryKey: 'net_60', name: 'Neto 60 días' },
  { entryKey: 'net_90', name: 'Neto 90 días' },
] as const;

export const ESCM_DELIVERY_METHODS = [
  { entryKey: 'pickup', name: 'Recoge en bodega' },
  { entryKey: 'delivery', name: 'Entrega a domicilio' },
  { entryKey: 'carrier', name: 'Transportadora' },
  { entryKey: 'port', name: 'Puerto / exportación' },
] as const;

export const ESCM_INCOTERMS = [
  { entryKey: 'EXW', name: 'EXW — Ex Works' },
  { entryKey: 'FOB', name: 'FOB — Free on Board' },
  { entryKey: 'CIF', name: 'CIF — Cost Insurance Freight' },
  { entryKey: 'DDP', name: 'DDP — Delivered Duty Paid' },
] as const;

export const ESCM_TAXES = [
  { entryKey: 'iva_19', name: 'IVA 19%', metadata: { rate: 19 } },
  { entryKey: 'iva_5', name: 'IVA 5%', metadata: { rate: 5 } },
  { entryKey: 'exempt', name: 'Exento', metadata: { rate: 0 } },
] as const;

export const ESCM_WITHHOLDINGS = [
  { entryKey: 'retefuente', name: 'Retención en la fuente' },
  { entryKey: 'reteiva', name: 'Retención IVA' },
  { entryKey: 'reteica', name: 'Retención ICA' },
] as const;

export const ESCM_PARAMETER_KEYS = [
  'auto_discount_enabled',
  'credit_check_enabled',
  'default_currency',
  'default_price_list',
  'default_payment_term',
  'prospect_auto_number',
] as const;

export const ESCM_DEFAULT_PARAMETERS: Array<{
  parameterKey: string;
  name: string;
  value: Record<string, unknown>;
}> = [
  { parameterKey: 'auto_discount_enabled', name: 'Descuentos automáticos', value: { enabled: true } },
  { parameterKey: 'credit_check_enabled', name: 'Validación de crédito', value: { enabled: true } },
  { parameterKey: 'default_currency', name: 'Moneda por defecto', value: { currencyKey: 'COP' } },
  { parameterKey: 'default_price_list', name: 'Lista de precios por defecto', value: { priceListKey: 'LIST-STANDARD' } },
  { parameterKey: 'default_payment_term', name: 'Condición de pago por defecto', value: { paymentTermKey: 'net_30' } },
  { parameterKey: 'prospect_auto_number', name: 'Numeración automática prospectos', value: { enabled: true } },
  { parameterKey: 'crm_pipeline_auto_seed', name: 'Sembrar pipeline por defecto', value: { enabled: true } },
  { parameterKey: 'quotation_validity_days', name: 'Vigencia cotización (días)', value: { days: 30 } },
];

export const ESCM_DEFAULT_PIPELINE_STAGES = [
  { stageKey: 'prospect', name: 'Prospecto', sortOrder: 10, defaultProbability: 5, isClosed: false, isWon: false, isLost: false, isArchived: false },
  { stageKey: 'qualified', name: 'Calificado', sortOrder: 20, defaultProbability: 15, isClosed: false, isWon: false, isLost: false, isArchived: false },
  { stageKey: 'contact_made', name: 'Contacto realizado', sortOrder: 30, defaultProbability: 25, isClosed: false, isWon: false, isLost: false, isArchived: false },
  { stageKey: 'meeting', name: 'Reunión', sortOrder: 40, defaultProbability: 40, isClosed: false, isWon: false, isLost: false, isArchived: false },
  { stageKey: 'proposal', name: 'Propuesta', sortOrder: 50, defaultProbability: 55, isClosed: false, isWon: false, isLost: false, isArchived: false },
  { stageKey: 'negotiation', name: 'Negociación', sortOrder: 60, defaultProbability: 70, isClosed: false, isWon: false, isLost: false, isArchived: false },
  { stageKey: 'approval', name: 'Aprobación', sortOrder: 70, defaultProbability: 85, isClosed: false, isWon: false, isLost: false, isArchived: false },
  { stageKey: 'won', name: 'Ganada', sortOrder: 80, defaultProbability: 100, isClosed: true, isWon: true, isLost: false, isArchived: false },
  { stageKey: 'lost', name: 'Perdida', sortOrder: 90, defaultProbability: 0, isClosed: true, isWon: false, isLost: true, isArchived: false },
  { stageKey: 'archived', name: 'Archivada', sortOrder: 100, defaultProbability: 0, isClosed: true, isWon: false, isLost: false, isArchived: true },
] as const;

export const ESCM_TAX_RATES: Record<string, number> = {
  iva_19: 19,
  iva_5: 5,
  exempt: 0,
};
