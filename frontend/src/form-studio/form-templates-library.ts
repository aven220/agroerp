import type { FormDefinitionSchema, FormFieldDefinition } from '../api/forms';
import { buildGeoCascadeFields } from './form-dynamic-catalogs';

export type FormStudioTemplate = {
  templateKey: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  schema: FormDefinitionSchema;
};

const settings = { offlineCapable: true, allowDraft: true };

function f(fields: FormFieldDefinition[], extra: Partial<FormDefinitionSchema> = {}): FormDefinitionSchema {
  return { version: 1, fields, settings, ...extra };
}

const SI_NO = [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }];

export const FORM_STUDIO_TEMPLATES: FormStudioTemplate[] = [
  {
    templateKey: 'tpl-registro-personas',
    name: 'Registro de personas',
    category: 'RRHH / General',
    description: 'Datos personales con acudiente si es menor de edad.',
    tags: ['personas', 'rrhh', 'condicional'],
    schema: f([
      { key: 'titulo', type: 'heading', label: 'Datos personales' },
      { key: 'nombres', type: 'text', label: 'Nombres', required: true },
      { key: 'apellidos', type: 'text', label: 'Apellidos', required: true },
      { key: 'documento', type: 'text', label: 'Número de documento', required: true },
      { key: 'email', type: 'text', label: 'Correo', metadata: { inputType: 'email' } },
      { key: 'telefono', type: 'text', label: 'Teléfono', metadata: { inputType: 'tel' } },
      { key: 'fecha_nacimiento', type: 'date', label: 'Fecha de nacimiento', required: true },
      { key: 'edad', type: 'number', label: 'Edad', validation: { min: 0, max: 120 } },
      { key: 'titulo_acudiente', type: 'heading', label: 'Acudiente', visibleWhen: { field: 'edad', operator: 'lt', value: 18 } },
      { key: 'acudiente_nombre', type: 'text', label: 'Nombre del acudiente', visibleWhen: { field: 'edad', operator: 'lt', value: 18 }, requiredWhen: { field: 'edad', operator: 'lt', value: 18 } },
      { key: 'acudiente_telefono', type: 'text', label: 'Teléfono acudiente', metadata: { inputType: 'tel' }, visibleWhen: { field: 'edad', operator: 'lt', value: 18 } },
      { key: 'acepta_terminos', type: 'boolean', label: '¿Acepta términos y condiciones?' },
      { key: 'firma', type: 'signature', label: 'Firma', visibleWhen: { field: 'acepta_terminos', operator: 'eq', value: true }, requiredWhen: { field: 'acepta_terminos', operator: 'eq', value: true } },
    ], {
      sections: [{ key: 'personal', title: 'Personal' }, { key: 'legal', title: 'Legal' }],
      settings: { ...settings, layoutMode: 'tabs' },
    }),
  },
  {
    templateKey: 'tpl-registro-clientes',
    name: 'Registro de clientes',
    category: 'Comercial',
    description: 'Alta de cliente con ubicación y contacto.',
    tags: ['clientes', 'crm'],
    schema: f([
      { key: 'razon_social', type: 'text', label: 'Razón social', required: true },
      { key: 'nit', type: 'text', label: 'NIT / ID fiscal' },
      { key: 'contacto', type: 'text', label: 'Persona de contacto' },
      { key: 'email', type: 'text', label: 'Correo comercial', metadata: { inputType: 'email' } },
      { key: 'telefono', type: 'text', label: 'Teléfono', metadata: { inputType: 'tel' } },
      ...buildGeoCascadeFields(),
      { key: 'direccion', type: 'textarea', label: 'Dirección detallada' },
      { key: 'cliente_tipo', type: 'select', label: 'Tipo de cliente', options: [
        { value: 'mayorista', label: 'Mayorista' },
        { value: 'exportador', label: 'Exportador' },
        { value: 'cooperativa', label: 'Cooperativa' },
      ]},
    ]),
  },
  {
    templateKey: 'tpl-registro-proveedores',
    name: 'Registro de proveedores',
    category: 'Compras',
    description: 'Proveedor con documentos y evaluación inicial.',
    tags: ['proveedores', 'compras'],
    schema: f([
      { key: 'nombre', type: 'text', label: 'Nombre del proveedor', required: true },
      { key: 'nit', type: 'text', label: 'NIT' },
      { key: 'categoria', type: 'select', label: 'Categoría', options: [
        { value: 'insumos', label: 'Insumos' },
        { value: 'maquinaria', label: 'Maquinaria' },
        { value: 'servicios', label: 'Servicios' },
      ]},
      { key: 'email', type: 'text', label: 'Correo', metadata: { inputType: 'url' } },
      { key: 'certificado', type: 'file', label: 'Certificado o RUT', metadata: { accept: '.pdf' } },
      { key: 'aprobado', type: 'radio', label: '¿Proveedor aprobado?', options: SI_NO },
      { key: 'obs_aprobacion', type: 'textarea', label: 'Observaciones de evaluación', visibleWhen: { field: 'aprobado', operator: 'eq', value: 'no' } },
    ]),
  },
  {
    templateKey: 'tpl-inspeccion-campo',
    name: 'Inspección de campo',
    category: 'Campo',
    description: 'Inspección con GPS, fotos y cadena de plagas.',
    tags: ['inspeccion', 'campo', 'gps'],
    schema: f([
      { key: 'inspector', type: 'text', label: 'Inspector', required: true },
      { key: 'fecha', type: 'date', label: 'Fecha', required: true },
      ...buildGeoCascadeFields('ubicacion'),
      { key: 'observa_problema', type: 'boolean', label: '¿Observa problema en cultivo?' },
      { key: 'tipo_problema', type: 'select', label: 'Tipo', options: [
        { value: 'plaga', label: 'Plaga' }, { value: 'enfermedad', label: 'Enfermedad' }, { value: 'maleza', label: 'Maleza' },
      ], visibleWhen: { field: 'observa_problema', operator: 'eq', value: true } },
      { key: 'foto', type: 'photo', label: 'Foto evidencia', visibleWhen: { field: 'tipo_problema', operator: 'not_empty' } },
      { key: 'gps', type: 'geo', label: 'GPS', required: true },
    ], { settings: { ...settings, requireGps: true } }),
  },
  {
    templateKey: 'tpl-visita-tecnica',
    name: 'Visita técnica',
    category: 'Campo',
    description: 'Visita agronómica con recomendaciones.',
    tags: ['visita', 'tecnica'],
    schema: f([
      { key: 'tecnico', type: 'text', label: 'Técnico responsable', required: true },
      { key: 'productor', type: 'text', label: 'Productor visitado' },
      { key: 'fecha_visita', type: 'datetime', label: 'Fecha y hora' },
      { key: 'cultivo', type: 'select', label: 'Cultivo', metadata: { catalogKey: 'cultivos', dynamicList: true }, options: [] },
      { key: 'hallazgos', type: 'textarea', label: 'Hallazgos' },
      { key: 'requiere_seguimiento', type: 'boolean', label: '¿Requiere seguimiento?' },
      { key: 'fecha_seguimiento', type: 'date', label: 'Fecha de seguimiento', visibleWhen: { field: 'requiere_seguimiento', operator: 'eq', value: true } },
      { key: 'firma_productor', type: 'signature', label: 'Firma productor', visibleWhen: { field: 'requiere_seguimiento', operator: 'eq', value: true } },
    ]),
  },
  {
    templateKey: 'tpl-siembra',
    name: 'Registro de siembra',
    category: 'Producción',
    description: 'Siembra con variedad, densidad y semilla.',
    tags: ['siembra', 'produccion'],
    schema: f([
      { key: 'fecha_siembra', type: 'date', label: 'Fecha de siembra', required: true },
      { key: 'lote', type: 'text', label: 'Lote' },
      { key: 'cultivo', type: 'select', label: 'Cultivo', metadata: { catalogKey: 'cultivos' }, options: [] },
      { key: 'variedad', type: 'text', label: 'Variedad' },
      { key: 'area_ha', type: 'number', label: 'Área (ha)', validation: { min: 0 } },
      { key: 'densidad', type: 'number', label: 'Densidad (plantas/ha)' },
      { key: 'semilla_lote', type: 'text', label: 'Lote de semilla' },
      { key: 'foto', type: 'photo', label: 'Foto del lote' },
    ]),
  },
  {
    templateKey: 'tpl-fertilizacion',
    name: 'Fertilización',
    category: 'Producción',
    description: 'Aplicación de fertilizante con dosis y EPI.',
    tags: ['fertilizacion', 'agroquimicos'],
    schema: f([
      { key: 'fecha', type: 'date', label: 'Fecha', required: true },
      { key: 'producto', type: 'select', label: 'Producto', metadata: { catalogKey: 'productos' }, options: [] },
      { key: 'dosis', type: 'number', label: 'Dosis (kg o L / ha)' },
      { key: 'metodo', type: 'radio', label: 'Método', options: [
        { value: 'foliar', label: 'Foliar' }, { value: 'suelo', label: 'Al suelo' }, { value: 'fertirriego', label: 'Fertirriego' },
      ]},
      { key: 'epi', type: 'boolean', label: '¿EPI completo?' },
      { key: 'foto_epi', type: 'photo', label: 'Foto EPI', visibleWhen: { field: 'epi', operator: 'eq', value: true } },
    ]),
  },
  {
    templateKey: 'tpl-riego',
    name: 'Registro de riego',
    category: 'Producción',
    description: 'Riego con horas y volumen.',
    tags: ['riego', 'agua'],
    schema: f([
      { key: 'fecha', type: 'date', label: 'Fecha' },
      { key: 'sistema', type: 'select', label: 'Sistema', options: [
        { value: 'goteo', label: 'Goteo' }, { value: 'aspersion', label: 'Aspersión' }, { value: 'gravedad', label: 'Gravedad' },
      ]},
      { key: 'horas', type: 'number', label: 'Horas de riego' },
      { key: 'volumen_m3', type: 'decimal', label: 'Volumen (m³)' },
      { key: 'observaciones', type: 'textarea', label: 'Observaciones' },
    ]),
  },
  {
    templateKey: 'tpl-fitosanitario',
    name: 'Control fitosanitario',
    category: 'Campo',
    description: 'Aplicación fitosanitaria con cadena de autorización.',
    tags: ['fitosanitario', 'plagas'],
    schema: f([
      { key: 'autorizado', type: 'boolean', label: '¿Aplicación autorizada?' },
      { key: 'producto', type: 'select', label: 'Producto', metadata: { catalogKey: 'productos' }, options: [], visibleWhen: { field: 'autorizado', operator: 'eq', value: true } },
      { key: 'plaga_objetivo', type: 'text', label: 'Plaga objetivo', visibleWhen: { field: 'producto', operator: 'not_empty' } },
      { key: 'dosis', type: 'number', label: 'Dosis', visibleWhen: { field: 'producto', operator: 'not_empty' } },
      { key: 'condiciones_ok', type: 'boolean', label: '¿Condiciones climáticas OK?', visibleWhen: { field: 'dosis', operator: 'gt', value: 0 } },
      { key: 'hora', type: 'time', label: 'Hora inicio', visibleWhen: { field: 'condiciones_ok', operator: 'eq', value: true } },
      { key: 'galeria', type: 'gallery', label: 'Fotos aplicación', metadata: { maxFiles: 4 }, visibleWhen: { field: 'condiciones_ok', operator: 'eq', value: true } },
    ]),
  },
  {
    templateKey: 'tpl-cosecha',
    name: 'Registro de cosecha',
    category: 'Producción',
    description: 'Cosecha con peso y calidad.',
    tags: ['cosecha', 'calidad'],
    schema: f([
      { key: 'fecha', type: 'date', label: 'Fecha de cosecha' },
      { key: 'cultivo', type: 'select', label: 'Cultivo', metadata: { catalogKey: 'cultivos' }, options: [] },
      { key: 'peso_kg', type: 'number', label: 'Peso total (kg)' },
      { key: 'calidad', type: 'radio', label: '¿Calidad exportación?', options: SI_NO },
      { key: 'motivo', type: 'textarea', label: 'Motivo rechazo calidad', visibleWhen: { field: 'calidad', operator: 'eq', value: 'no' } },
      { key: 'foto', type: 'photo', label: 'Foto del producto' },
    ]),
  },
  {
    templateKey: 'tpl-recepcion-inventario',
    name: 'Recepción de inventario',
    category: 'Inventario',
    description: 'Entrada de mercancía con QR y proveedor.',
    tags: ['inventario', 'entrada'],
    schema: f([
      { key: 'fecha', type: 'datetime', label: 'Fecha recepción' },
      { key: 'proveedor', type: 'select', label: 'Proveedor', metadata: { catalogKey: 'proveedores' }, options: [] },
      { key: 'producto', type: 'select', label: 'Producto', metadata: { catalogKey: 'productos' }, options: [] },
      { key: 'cantidad', type: 'number', label: 'Cantidad recibida' },
      { key: 'qr_lote', type: 'qrcode', label: 'Escanear QR lote' },
      { key: 'factura', type: 'file', label: 'Adjuntar factura', metadata: { accept: '.pdf' } },
    ]),
  },
  {
    templateKey: 'tpl-salida-inventario',
    name: 'Salida de inventario',
    category: 'Inventario',
    description: 'Despacho o consumo interno.',
    tags: ['inventario', 'salida'],
    schema: f([
      { key: 'fecha', type: 'datetime', label: 'Fecha salida' },
      { key: 'bodega', type: 'select', label: 'Bodega', options: [
        { value: 'principal', label: 'Principal' }, { value: 'campo', label: 'Campo' },
      ]},
      { key: 'producto', type: 'select', label: 'Producto', metadata: { catalogKey: 'productos' }, options: [] },
      { key: 'cantidad', type: 'number', label: 'Cantidad' },
      { key: 'destino', type: 'text', label: 'Destino / Lote destino' },
      { key: 'responsable', type: 'text', label: 'Responsable' },
    ]),
  },
  {
    templateKey: 'tpl-mantenimiento',
    name: 'Mantenimiento',
    category: 'Operaciones',
    description: 'Mantenimiento de equipos con repuestos.',
    tags: ['mantenimiento', 'maquinaria'],
    schema: f([
      { key: 'equipo', type: 'text', label: 'Equipo', required: true },
      { key: 'tipo', type: 'select', label: 'Tipo mantenimiento', options: [
        { value: 'preventivo', label: 'Preventivo' }, { value: 'correctivo', label: 'Correctivo' },
      ]},
      { key: 'falla', type: 'boolean', label: '¿Presenta falla?' },
      { key: 'descripcion_falla', type: 'textarea', label: 'Descripción', visibleWhen: { field: 'falla', operator: 'eq', value: true } },
      { key: 'repuesto', type: 'boolean', label: '¿Requiere repuesto?', visibleWhen: { field: 'falla', operator: 'eq', value: true } },
      { key: 'codigo_repuesto', type: 'text', label: 'Código repuesto', visibleWhen: { field: 'repuesto', operator: 'eq', value: true } },
      { key: 'foto', type: 'photo', label: 'Foto equipo' },
    ]),
  },
  {
    templateKey: 'tpl-rrhh',
    name: 'RRHH — Asistencia y capacitación',
    category: 'RRHH',
    description: 'Asistencia con evaluación y certificado.',
    tags: ['rrhh', 'capacitacion'],
    schema: f([
      { key: 'empleado', type: 'text', label: 'Nombre empleado', required: true },
      { key: 'fecha', type: 'date', label: 'Fecha' },
      { key: 'asistio', type: 'boolean', label: '¿Asistió?' },
      { key: 'puntaje', type: 'number', label: 'Puntaje evaluación (0-100)', visibleWhen: { field: 'asistio', operator: 'eq', value: true } },
      { key: 'certifica', type: 'boolean', label: '¿Aprueba certificación?', visibleWhen: { field: 'puntaje', operator: 'gte', value: 70 } },
      { key: 'firma', type: 'signature', label: 'Firma empleado', visibleWhen: { field: 'certifica', operator: 'eq', value: true } },
    ]),
  },
  {
    templateKey: 'tpl-encuestas',
    name: 'Encuesta de satisfacción',
    category: 'Encuestas',
    description: 'Likert, emoji y comentarios.',
    tags: ['encuesta', 'satisfaccion'],
    schema: f([
      { key: 'titulo', type: 'heading', label: 'Cuéntenos su experiencia' },
      { key: 'satisfaccion', type: 'rating', label: 'Satisfacción general (1-5)' },
      { key: 'recomendaria', type: 'radio', label: '¿Recomendaría el servicio?', options: SI_NO },
      { key: 'aspectos', type: 'multi_select', label: 'Aspectos a mejorar', options: [
        { value: 'tiempo', label: 'Tiempo de respuesta' },
        { value: 'calidad', label: 'Calidad' },
        { value: 'precio', label: 'Precio' },
      ], visibleWhen: { field: 'recomendaria', operator: 'eq', value: 'no' } },
      { key: 'comentario', type: 'textarea', label: 'Comentarios adicionales' },
      { key: 'emoji', type: 'emoji', label: '¿Cómo se siente hoy?' },
    ]),
  },
];

export function getTemplateByKey(key: string) {
  return FORM_STUDIO_TEMPLATES.find((t) => t.templateKey === key);
}

export function getTemplatesByCategory() {
  const map = new Map<string, FormStudioTemplate[]>();
  for (const t of FORM_STUDIO_TEMPLATES) {
    const list = map.get(t.category) ?? [];
    list.push(t);
    map.set(t.category, list);
  }
  return map;
}
