/** AGROERP unified iconography — consistent module symbols */
export const ModuleIcons = {
  home: '◫',
  favorites: '★',
  work: '📋',
  agriculture: '🌱',
  logistics: '📦',
  commercial: '💰',
  production: '🏭',
  assets: '🔧',
  hr: '👥',
  finance: '💳',
  intelligence: '📊',
  ecosystem: '🌐',
  admin: '⚙',
  producers: '👤',
  farms: '🌿',
  lots: '📍',
  gis: '🗺',
  inventory: '📦',
  sales: '💼',
  manufacturing: '⚙',
  maintenance: '🔩',
  iot: '📡',
  bi: '📊',
  ai: '🤖',
  documents: '📄',
  workflow: '⚡',
  notifications: '🔔',
  search: '⌕',
  settings: '⚙',
  success: '✓',
  warning: '⚠',
  error: '✕',
  info: 'ℹ',
  add: '＋',
  edit: '✎',
  delete: '🗑',
  export: '↗',
  import: '↙',
  sync: '↻',
  filter: '⧩',
  calendar: '📅',
  chart: '📈',
  map: '🗺',
  coffee: '☕',
} as const;

export type ModuleIconKey = keyof typeof ModuleIcons;

export function ModuleIcon({ name, className = '' }: { name: ModuleIconKey; className?: string }) {
  return (
    <span className={`ds-icon ${className}`.trim()} aria-hidden>
      {ModuleIcons[name]}
    </span>
  );
}
