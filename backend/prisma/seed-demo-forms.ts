import { PrismaClient } from '@prisma/client';

const SI_NO = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
];

const baseSettings = {
  offlineCapable: true,
  allowDraft: true,
  requireGps: false,
};

export const DEMO_FORMS = [
  {
    formKey: 'control-plagas',
    name: 'Control de plagas en campo',
    description:
      'Inspección de plagas con reglas en cascada: síntomas → tipo → tratamiento → aplicación.',
    schema: {
      version: 1,
      settings: baseSettings,
      fields: [
        { key: 'operario', type: 'text', label: 'Nombre del operario', required: true },
        { key: 'fecha_visita', type: 'date', label: 'Fecha de visita', required: true },
        { key: 'lote_codigo', type: 'text', label: 'Código del lote', required: true },
        { key: 'observa_plagas', type: 'boolean', label: '¿Observa presencia de plagas?' },
        {
          key: 'tipo_plaga',
          type: 'select',
          label: 'Tipo de plaga detectada',
          options: [
            { value: 'broca', label: 'Broca del café' },
            { value: 'roya', label: 'Roya' },
            { value: 'trips', label: 'Trips' },
            { value: 'otra', label: 'Otra' },
          ],
          visibleWhen: { field: 'observa_plagas', operator: 'eq', value: true },
          requiredWhen: { field: 'observa_plagas', operator: 'eq', value: true },
        },
        {
          key: 'gravedad',
          type: 'radio',
          label: 'Nivel de gravedad',
          options: [
            { value: 'leve', label: 'Leve' },
            { value: 'moderada', label: 'Moderada' },
            { value: 'severa', label: 'Severa' },
          ],
          visibleWhen: { field: 'tipo_plaga', operator: 'not_empty' },
          requiredWhen: { field: 'tipo_plaga', operator: 'not_empty' },
        },
        {
          key: 'requiere_tratamiento',
          type: 'boolean',
          label: '¿Requiere tratamiento químico?',
          visibleWhen: { field: 'gravedad', operator: 'not_empty' },
        },
        {
          key: 'producto_tratamiento',
          type: 'select',
          label: 'Producto recomendado',
          options: [
            { value: 'cobre', label: 'Oxicloruro de cobre' },
            { value: 'abamectina', label: 'Abamectina' },
            { value: 'spinosad', label: 'Spinosad' },
            { value: 'biologico', label: 'Control biológico' },
          ],
          visibleWhen: { field: 'requiere_tratamiento', operator: 'eq', value: true },
          requiredWhen: { field: 'requiere_tratamiento', operator: 'eq', value: true },
        },
        {
          key: 'fecha_aplicacion',
          type: 'date',
          label: 'Fecha programada de aplicación',
          visibleWhen: { field: 'producto_tratamiento', operator: 'not_empty' },
          requiredWhen: { field: 'producto_tratamiento', operator: 'not_empty' },
        },
        {
          key: 'foto_evidencia',
          type: 'photo',
          label: 'Foto de la plaga / daño',
          visibleWhen: { field: 'producto_tratamiento', operator: 'not_empty' },
        },
        { key: 'ubicacion', type: 'geo', label: 'Ubicación GPS del lote', required: true },
      ],
    },
  },
  {
    formKey: 'calidad-cosecha',
    name: 'Calidad de cosecha',
    description:
      'Recepción de producto con rechazo, reclasificación y aprobación en cadena.',
    schema: {
      version: 1,
      settings: baseSettings,
      fields: [
        { key: 'recolector', type: 'text', label: 'Nombre del recolector', required: true },
        { key: 'fecha_recepcion', type: 'date', label: 'Fecha de recepción', required: true },
        {
          key: 'cultivo',
          type: 'select',
          label: 'Cultivo',
          required: true,
          options: [
            { value: 'cafe', label: 'Café' },
            { value: 'cacao', label: 'Cacao' },
            { value: 'platano', label: 'Plátano' },
          ],
        },
        { key: 'peso_kg', type: 'number', label: 'Peso recibido (kg)', validation: { min: 0 } },
        {
          key: 'cumple_calidad',
          type: 'radio',
          label: '¿Cumple estándar de calidad?',
          options: SI_NO,
          required: true,
        },
        {
          key: 'motivo_rechazo',
          type: 'textarea',
          label: 'Motivo del rechazo',
          visibleWhen: { field: 'cumple_calidad', operator: 'eq', value: 'no' },
          requiredWhen: { field: 'cumple_calidad', operator: 'eq', value: 'no' },
        },
        {
          key: 'puede_reclasificar',
          type: 'boolean',
          label: '¿Se puede reclasificar el lote?',
          visibleWhen: { field: 'cumple_calidad', operator: 'eq', value: 'no' },
        },
        {
          key: 'nueva_clasificacion',
          type: 'select',
          label: 'Nueva clasificación',
          options: [
            { value: 'segunda', label: 'Segunda' },
            { value: 'descarte', label: 'Descarte' },
            { value: 'industrial', label: 'Industrial' },
          ],
          visibleWhen: { field: 'puede_reclasificar', operator: 'eq', value: true },
          requiredWhen: { field: 'puede_reclasificar', operator: 'eq', value: true },
        },
        {
          key: 'peso_reclasificado',
          type: 'number',
          label: 'Peso reclasificado (kg)',
          validation: { min: 0 },
          visibleWhen: { field: 'nueva_clasificacion', operator: 'not_empty' },
          requiredWhen: { field: 'nueva_clasificacion', operator: 'not_empty' },
        },
        {
          key: 'supervisor_aprueba',
          type: 'boolean',
          label: '¿Supervisor aprueba la reclasificación?',
          visibleWhen: { field: 'peso_reclasificado', operator: 'gt', value: 0 },
        },
        {
          key: 'observaciones_finales',
          type: 'textarea',
          label: 'Observaciones finales',
          visibleWhen: { field: 'supervisor_aprueba', operator: 'eq', value: true },
        },
      ],
    },
  },
  {
    formKey: 'mantenimiento-maquinaria',
    name: 'Mantenimiento de maquinaria',
    description:
      'Reporte de fallas con cadena: revisión → repuesto → proveedor → entrega.',
    schema: {
      version: 1,
      settings: baseSettings,
      fields: [
        { key: 'tecnico', type: 'text', label: 'Técnico responsable', required: true },
        { key: 'fecha_reporte', type: 'date', label: 'Fecha del reporte', required: true },
        {
          key: 'equipo',
          type: 'select',
          label: 'Equipo',
          required: true,
          options: [
            { value: 'tractor', label: 'Tractor' },
            { value: 'fumigadora', label: 'Fumigadora' },
            { value: 'bomba_riego', label: 'Bomba de riego' },
            { value: 'cosechadora', label: 'Cosechadora' },
          ],
        },
        { key: 'horas_uso', type: 'number', label: 'Horas de uso', validation: { min: 0 } },
        {
          key: 'requiere_revision',
          type: 'boolean',
          label: '¿Requiere revisión técnica?',
        },
        {
          key: 'tipo_falla',
          type: 'select',
          label: 'Tipo de falla',
          options: [
            { value: 'mecanica', label: 'Mecánica' },
            { value: 'electrica', label: 'Eléctrica' },
            { value: 'hidraulica', label: 'Hidráulica' },
            { value: 'software', label: 'Software / sensores' },
          ],
          visibleWhen: { field: 'requiere_revision', operator: 'eq', value: true },
          requiredWhen: { field: 'requiere_revision', operator: 'eq', value: true },
        },
        {
          key: 'repuesto_necesario',
          type: 'boolean',
          label: '¿Se necesita repuesto?',
          visibleWhen: { field: 'tipo_falla', operator: 'not_empty' },
        },
        {
          key: 'repuesto_codigo',
          type: 'text',
          label: 'Código del repuesto',
          visibleWhen: { field: 'repuesto_necesario', operator: 'eq', value: true },
          requiredWhen: { field: 'repuesto_necesario', operator: 'eq', value: true },
        },
        {
          key: 'proveedor_contactado',
          type: 'boolean',
          label: '¿Ya contactó al proveedor?',
          visibleWhen: { field: 'repuesto_codigo', operator: 'not_empty' },
        },
        {
          key: 'fecha_entrega_estimada',
          type: 'date',
          label: 'Fecha estimada de entrega',
          visibleWhen: { field: 'proveedor_contactado', operator: 'eq', value: true },
          requiredWhen: { field: 'proveedor_contactado', operator: 'eq', value: true },
        },
        {
          key: 'foto_equipo',
          type: 'photo',
          label: 'Foto del equipo / falla',
          visibleWhen: { field: 'proveedor_contactado', operator: 'eq', value: true },
        },
      ],
    },
  },
  {
    formKey: 'capacitacion-campo',
    name: 'Capacitación en campo',
    description:
      'Seguimiento de asistencia, evaluaciones y emisión de certificado en cascada.',
    schema: {
      version: 1,
      settings: baseSettings,
      fields: [
        { key: 'instructor', type: 'text', label: 'Instructor', required: true },
        { key: 'fecha_capacitacion', type: 'date', label: 'Fecha', required: true },
        {
          key: 'tema',
          type: 'select',
          label: 'Tema de capacitación',
          required: true,
          options: [
            { value: 'seguridad', label: 'Seguridad industrial' },
            { value: 'agroquimicos', label: 'Manejo de agroquímicos' },
            { value: 'calidad', label: 'Buenas prácticas de calidad' },
            { value: 'bioseguridad', label: 'Bioseguridad' },
          ],
        },
        { key: 'participante', type: 'text', label: 'Nombre del participante', required: true },
        {
          key: 'asistio',
          type: 'boolean',
          label: '¿Asistió a la capacitación?',
        },
        {
          key: 'evaluacion_teorica',
          type: 'number',
          label: 'Puntaje evaluación teórica (0-100)',
          validation: { min: 0, max: 100 },
          visibleWhen: { field: 'asistio', operator: 'eq', value: true },
          requiredWhen: { field: 'asistio', operator: 'eq', value: true },
        },
        {
          key: 'evaluacion_practica',
          type: 'number',
          label: 'Puntaje evaluación práctica (0-100)',
          validation: { min: 0, max: 100 },
          visibleWhen: { field: 'evaluacion_teorica', operator: 'gte', value: 60 },
          requiredWhen: { field: 'evaluacion_teorica', operator: 'gte', value: 60 },
        },
        {
          key: 'emitir_certificado',
          type: 'boolean',
          label: '¿Aprueba y emite certificado?',
          visibleWhen: { field: 'evaluacion_practica', operator: 'gte', value: 70 },
        },
        {
          key: 'numero_certificado',
          type: 'text',
          label: 'Número de certificado',
          visibleWhen: { field: 'emitir_certificado', operator: 'eq', value: true },
          requiredWhen: { field: 'emitir_certificado', operator: 'eq', value: true },
        },
        {
          key: 'firma_participante',
          type: 'signature',
          label: 'Firma del participante',
          visibleWhen: { field: 'emitir_certificado', operator: 'eq', value: true },
          requiredWhen: { field: 'emitir_certificado', operator: 'eq', value: true },
        },
      ],
    },
  },
  {
    formKey: 'aplicacion-agroquimica',
    name: 'Aplicación de agroquímico',
    description:
      'Autorización, dosis, condiciones climáticas y evidencia EPI en cadena.',
    schema: {
      version: 1,
      settings: { ...baseSettings, requireGps: true },
      fields: [
        { key: 'aplicador', type: 'text', label: 'Nombre del aplicador', required: true },
        { key: 'fecha', type: 'date', label: 'Fecha de aplicación', required: true },
        { key: 'lote', type: 'text', label: 'Lote / parcela', required: true },
        {
          key: 'producto_autorizado',
          type: 'boolean',
          label: '¿Cuenta con producto autorizado por agronomía?',
        },
        {
          key: 'producto_nombre',
          type: 'select',
          label: 'Producto a aplicar',
          options: [
            { value: 'glifosato', label: 'Glifosato' },
            { value: 'cobre', label: 'Cobre' },
            { value: 'abamectina', label: 'Abamectina' },
            { value: 'urea', label: 'Urea' },
          ],
          visibleWhen: { field: 'producto_autorizado', operator: 'eq', value: true },
          requiredWhen: { field: 'producto_autorizado', operator: 'eq', value: true },
        },
        {
          key: 'dosis_ha',
          type: 'number',
          label: 'Dosis (L o kg / ha)',
          validation: { min: 0.01 },
          visibleWhen: { field: 'producto_nombre', operator: 'not_empty' },
          requiredWhen: { field: 'producto_nombre', operator: 'not_empty' },
        },
        {
          key: 'condiciones_seguras',
          type: 'boolean',
          label: '¿Condiciones climáticas seguras (viento < 10 km/h, sin lluvia)?',
          visibleWhen: { field: 'dosis_ha', operator: 'gt', value: 0 },
        },
        {
          key: 'hora_inicio',
          type: 'text',
          label: 'Hora de inicio (HH:MM)',
          visibleWhen: { field: 'condiciones_seguras', operator: 'eq', value: true },
          requiredWhen: { field: 'condiciones_seguras', operator: 'eq', value: true },
        },
        {
          key: 'epi_completo',
          type: 'boolean',
          label: '¿Usó EPI completo (overol, guantes, mascarilla, gafas)?',
          visibleWhen: { field: 'condiciones_seguras', operator: 'eq', value: true },
        },
        {
          key: 'foto_epi',
          type: 'photo',
          label: 'Foto del aplicador con EPI',
          visibleWhen: { field: 'epi_completo', operator: 'eq', value: true },
        },
        {
          key: 'ubicacion_aplicacion',
          type: 'geo',
          label: 'Ubicación GPS de aplicación',
          visibleWhen: { field: 'epi_completo', operator: 'eq', value: true },
          requiredWhen: { field: 'epi_completo', operator: 'eq', value: true },
          validation: { maxAccuracyMeters: 50 },
        },
      ],
    },
  },
] as const;

export async function seedDemoForms(
  prisma: PrismaClient,
  organizationId: string,
  createdBy: string,
) {
  for (const def of DEMO_FORMS) {
    const form = await prisma.formDefinition.upsert({
      where: {
        organizationId_formKey_version: {
          organizationId,
          formKey: def.formKey,
          version: 1,
        },
      },
      update: {
        name: def.name,
        description: def.description,
        schema: def.schema,
        status: 'draft',
      },
      create: {
        organizationId,
        formKey: def.formKey,
        name: def.name,
        description: def.description,
        version: 1,
        schema: def.schema,
        status: 'draft',
        createdBy,
      },
    });
    console.log(`✅ Demo form (borrador): ${form.name} [${form.formKey}]`);
  }
}
