/**
 * PM-43 — Menú horizontal curado (presentación).
 * Misma rutas/permisos; solo define qué aparece en cada dropdown y textos amigables.
 * No cambia backend ni lógica de acceso.
 */

import type { NavCategoryId } from './navigation';

export interface HeaderMenuEntry {
  /** id del NavItem existente */
  id: string;
  /** Etiqueta amigable en el dropdown */
  label: string;
  /** Texto corto de ayuda */
  hint: string;
}

export interface HeaderMenuPillar {
  categoryId: NavCategoryId;
  label: string;
  /** Descripción del pilar en el encabezado del dropdown */
  blurb: string;
  entries: HeaderMenuEntry[];
}

/** Orden y contenido fijo de la barra — sin ítems sueltos. */
export const HEADER_MENU_PILLARS: HeaderMenuPillar[] = [
  {
    categoryId: 'operation',
    label: 'Operación',
    blurb: 'Trabajo diario del negocio',
    entries: [
      { id: 'nav-compras', label: 'Compras', hint: 'Recepción, pesaje y liquidación' },
      { id: 'nav-calidad', label: 'Calidad', hint: 'Muestras y catación' },
      { id: 'nav-inventario', label: 'Inventario', hint: 'Existencias y bodegas' },
      { id: 'nav-docs', label: 'Documentos', hint: 'Archivos y evidencias' },
      { id: 'nav-procesos', label: 'Procesos', hint: 'Bandeja de aprobaciones' },
    ],
  },
  {
    categoryId: 'gestion',
    label: 'Gestión',
    blurb: 'Maestros del negocio',
    entries: [
      { id: 'nav-productores', label: 'Productores', hint: 'Asociados y contactos' },
      { id: 'nav-fincas', label: 'Fincas', hint: 'Predios y ubicaciones' },
      { id: 'nav-lotes', label: 'Lotes', hint: 'Parcelas y trazabilidad' },
    ],
  },
  {
    categoryId: 'reports',
    label: 'Reportes',
    blurb: 'Consulta e indicadores',
    entries: [
      { id: 'nav-rep-ops', label: 'Operativos', hint: 'Reportes del día a día' },
      { id: 'nav-rep-mgr', label: 'Gerenciales', hint: 'KPIs y visión ejecutiva' },
      { id: 'nav-rep-audit', label: 'Auditoría', hint: 'Trazas y accesos' },
    ],
  },
  {
    categoryId: 'configuration',
    label: 'Configuración',
    blurb: 'Ajustes de la plataforma',
    entries: [
      { id: 'nav-cfg-empresa', label: 'Empresa', hint: 'Datos fiscales y ficha' },
      { id: 'nav-cfg-usuarios', label: 'Usuarios', hint: 'Cuentas de acceso' },
      { id: 'nav-cfg-roles', label: 'Roles', hint: 'Permisos y perfiles' },
      { id: 'nav-cfg-documentos', label: 'Documentos', hint: 'Plantillas y numeración' },
      { id: 'nav-cfg-inventario', label: 'Inventario', hint: 'Parámetros de bodega' },
      { id: 'nav-cfg-prefs', label: 'Preferencias', hint: 'Resumen de configuración' },
    ],
  },
  {
    categoryId: 'help',
    label: 'Ayuda',
    blurb: 'Soporte cuando lo necesite',
    entries: [
      { id: 'nav-help-center', label: 'Centro de ayuda', hint: 'Guías y respuestas' },
    ],
  },
];
