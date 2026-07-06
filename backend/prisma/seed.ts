import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHmac } from 'crypto';
import { SYSTEM_PERMISSIONS, SYSTEM_ROLES, BI_DASHBOARD_CATEGORIES } from '@agroerp/shared';
import { seedDemoForms } from './seed-demo-forms';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AGROERP database...');

  // System permissions
  for (const perm of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: {
        resource_action_scope: {
          resource: perm.resource,
          action: perm.action,
          scope: perm.scope,
        },
      },
      update: {},
      create: {
        resource: perm.resource,
        action: perm.action,
        scope: perm.scope,
        description: `${perm.action} ${perm.resource}`,
        moduleId: 'core',
      },
    });
  }
  console.log(`✅ ${SYSTEM_PERMISSIONS.length} permissions seeded`);

  // Demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-agro' },
    update: {},
    create: {
      name: 'Demo Agroindustrial',
      slug: 'demo-agro',
      settings: { locale: 'es', timezone: 'America/Bogota' },
    },
  });
  console.log(`✅ Organization: ${demoOrg.name}`);

  const permissions = await prisma.permission.findMany();

  // System roles for demo org
  const roleDefs = [
    { name: 'Administrator', slug: SYSTEM_ROLES.ADMIN, perms: permissions },
    {
      name: 'Manager',
      slug: SYSTEM_ROLES.MANAGER,
      perms: permissions.filter((p) => p.action !== 'delete'),
    },
    {
      name: 'Field Agent',
      slug: SYSTEM_ROLES.FIELD_AGENT,
      perms: permissions.filter(
        (p) =>
          (p.resource === 'resource' &&
            ['read', 'create', 'update'].includes(p.action)) ||
          (p.resource === 'producer' &&
            ['read', 'create', 'update'].includes(p.action)) ||
          (p.resource === 'farm' &&
            ['read', 'create', 'update'].includes(p.action)) ||
          (p.resource === 'lot' &&
            ['read', 'create', 'update'].includes(p.action)) ||
          (p.resource === 'field_operation' &&
            p.action === 'create') ||
          (p.resource === 'form' &&
            ['read', 'submit'].includes(p.action)) ||
          (p.resource === 'workflow' &&
            ['read', 'execute', 'approve'].includes(p.action)) ||
          (p.resource === 'notification' &&
            ['read', 'update'].includes(p.action)) ||
          (p.resource === 'alert' && p.action === 'acknowledge') ||
          (p.resource === 'analytics' && p.action === 'read') ||
          (p.resource === 'dashboard' && p.action === 'read') ||
          (p.resource === 'kpi' && p.action === 'read') ||
          (p.resource === 'query' && ['read', 'execute'].includes(p.action)) ||
          (p.resource === 'ai' && ['read', 'chat', 'copilot:use'].includes(p.action)) ||
          (p.resource === 'sync' && ['read', 'push'].includes(p.action)) ||
          (p.resource === 'user' && p.action === 'read'),
      ),
    },
    {
      name: 'Viewer',
      slug: SYSTEM_ROLES.VIEWER,
      perms: permissions.filter((p) => p.action === 'read'),
    },
  ];

  for (const roleDef of roleDefs) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_slug: {
          organizationId: demoOrg.id,
          slug: roleDef.slug,
        },
      },
      update: {},
      create: {
        organizationId: demoOrg.id,
        name: roleDef.name,
        slug: roleDef.slug,
        isSystem: true,
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: roleDef.perms.map((p) => ({
        roleId: role.id,
        permissionId: p.id,
      })),
    });
  }
  console.log(`✅ ${roleDefs.length} roles seeded`);

  // Demo admin user
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const adminUser = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: demoOrg.id,
        email: 'admin@demo.agroerp.com',
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      email: 'admin@demo.agroerp.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Demo',
    },
  });

  const adminRole = await prisma.role.findFirst({
    where: { organizationId: demoOrg.id, slug: SYSTEM_ROLES.ADMIN },
  });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
      },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    });
  }
  console.log(`✅ Admin user: admin@demo.agroerp.com / Admin123!`);

  // Demo metadata schema for generic entities
  const schemaDef = {
    resourceType: 'generic_entity',
    version: 1,
    label: 'Entidad genérica demo',
    fields: [
      { key: 'name', type: 'string', label: 'Nombre', required: true },
      { key: 'code', type: 'string', label: 'Código', required: false },
      { key: 'area_ha', type: 'number', label: 'Área (ha)', validation: { min: 0 } },
      { key: 'active', type: 'boolean', label: 'Activo' },
      { key: 'location', type: 'geo', label: 'Ubicación GPS' },
    ],
    states: ['active', 'inactive', 'archived'],
  };

  await prisma.resourceSchema.upsert({
    where: {
      organizationId_resourceType_version: {
        organizationId: demoOrg.id,
        resourceType: 'generic_entity',
        version: 1,
      },
    },
    update: { definition: schemaDef, active: true },
    create: {
      organizationId: demoOrg.id,
      resourceType: 'generic_entity',
      version: 1,
      label: 'Entidad genérica demo',
      definition: schemaDef,
      active: true,
    },
  });
  console.log('✅ Demo metadata schema: generic_entity');

  // Demo dynamic form for field capture
  const fieldInspectionSchema = {
    version: 1,
    settings: {
      requireGps: true,
      offlineCapable: true,
      allowDraft: true,
      geofence: {
        center: { lat: 4.6097, lng: -74.0817 },
        radiusMeters: 50000,
      },
    },
    fields: [
      {
        key: 'inspector_name',
        type: 'text',
        label: 'Nombre del inspector',
        required: true,
      },
      {
        key: 'visit_date',
        type: 'date',
        label: 'Fecha de visita',
        required: true,
      },
      {
        key: 'crop_type',
        type: 'select',
        label: 'Tipo de cultivo',
        required: true,
        options: [
          { value: 'coffee', label: 'Café' },
          { value: 'cacao', label: 'Cacao' },
          { value: 'corn', label: 'Maíz' },
        ],
      },
      {
        key: 'area_ha',
        type: 'number',
        label: 'Área (ha)',
        validation: { min: 0, max: 10000 },
        visibleWhen: { field: 'crop_type', operator: 'not_empty' },
      },
      {
        key: 'has_pests',
        type: 'boolean',
        label: '¿Presencia de plagas?',
      },
      {
        key: 'pest_description',
        type: 'text',
        label: 'Descripción de plagas',
        visibleWhen: { field: 'has_pests', operator: 'eq', value: true },
        requiredWhen: { field: 'has_pests', operator: 'eq', value: true },
      },
      {
        key: 'location',
        type: 'geo',
        label: 'Ubicación GPS',
        required: true,
        validation: { maxAccuracyMeters: 50 },
      },
      {
        key: 'photo_evidence',
        type: 'photo',
        label: 'Foto de evidencia',
      },
      {
        key: 'estimated_yield',
        type: 'calculated',
        label: 'Rendimiento estimado (kg)',
        calculate: {
          expression: '{area_ha} * 800',
          dependsOn: ['area_ha'],
        },
      },
    ],
  };

  const demoForm = await prisma.formDefinition.upsert({
    where: {
      organizationId_formKey_version: {
        organizationId: demoOrg.id,
        formKey: 'field-inspection',
        version: 1,
      },
    },
    update: {
      schema: fieldInspectionSchema,
      status: 'published',
      publishedAt: new Date(),
    },
    create: {
      organizationId: demoOrg.id,
      formKey: 'field-inspection',
      name: 'Inspección de campo',
      description: 'Formulario demo para captura offline en campo',
      version: 1,
      schema: fieldInspectionSchema,
      status: 'published',
      publishedAt: new Date(),
      createdBy: adminUser.id,
    },
  });
  console.log(`✅ Demo form published: ${demoForm.name} (${demoForm.formKey} v${demoForm.version})`);

  await seedDemoForms(prisma, demoOrg.id, adminUser.id);

  await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: demoOrg.id,
        code: 'HQ',
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      type: 'company',
      name: 'Sede Principal',
      code: 'HQ',
    },
  });

  await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: demoOrg.id,
        code: 'REG-ANT',
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      type: 'region',
      name: 'Regional Antioquia',
      code: 'REG-ANT',
    },
  });
  console.log('✅ Demo org units seeded');

  const existingPolicy = await prisma.policy.findFirst({
    where: { organizationId: demoOrg.id, name: 'No compras después de 6 PM' },
  });
  if (!existingPolicy) {
    await prisma.policy.create({
      data: {
        organizationId: demoOrg.id,
        name: 'No compras después de 6 PM',
        description: 'Deniega creación de compras fuera de horario laboral',
        effect: 'deny',
        resource: 'purchase',
        action: 'create',
        subject: {},
        conditions: {
          all: [{ type: 'time_after', value: '18:00' }],
        },
        priority: 100,
        active: true,
      },
    });
    console.log('✅ Demo PBAC policy seeded');
  }

  const genericWorkflow = await prisma.workflowDefinition.findFirst({
    where: { organizationId: demoOrg.id, workflowKey: 'generic-approval' },
  });

  if (!genericWorkflow) {
    const definition = await prisma.workflowDefinition.create({
      data: {
        organizationId: demoOrg.id,
        workflowKey: 'generic-approval',
        name: 'Aprobación genérica',
        description: 'Plantilla reutilizable de aprobación multi-estado (motor demo)',
        resourceType: 'generic_entity',
        createdBy: adminUser.id,
        versions: {
          create: {
            version: 1,
            status: 'published',
            publishedAt: new Date(),
            publishedBy: adminUser.id,
            createdBy: adminUser.id,
            definition: {
              version: 1,
              settings: { defaultSlaHours: 48 },
              states: [
                { key: 'draft', name: 'Borrador', type: 'initial' },
                { key: 'pending_review', name: 'En revisión', type: 'intermediate', slaHours: 24 },
                { key: 'approved', name: 'Aprobado', type: 'final' },
                { key: 'rejected', name: 'Rechazado', type: 'final' },
                { key: 'cancelled', name: 'Cancelado', type: 'cancelled' },
              ],
              transitions: [
                {
                  key: 'submit',
                  name: 'Enviar a revisión',
                  from: 'draft',
                  to: 'pending_review',
                  permissions: ['workflow:execute'],
                },
                {
                  key: 'approve',
                  name: 'Aprobar',
                  from: 'pending_review',
                  to: 'approved',
                  permissions: ['workflow:approve'],
                  participants: [{ type: 'role', ref: 'manager' }],
                  requirements: { comment: true },
                  notifications: [{ channel: 'internal', template: 'workflow_approved' }],
                  actions: [{ type: 'create_audit', config: {} }],
                },
                {
                  key: 'reject',
                  name: 'Rechazar',
                  from: 'pending_review',
                  to: 'rejected',
                  permissions: ['workflow:approve'],
                  participants: [{ type: 'role', ref: 'manager' }],
                  requirements: { comment: true },
                },
                {
                  key: 'cancel',
                  name: 'Cancelar',
                  from: '*',
                  to: 'cancelled',
                  permissions: ['workflow:cancel'],
                },
              ],
            },
          },
        },
      },
    });
    console.log(`✅ Generic workflow published: ${definition.workflowKey}`);
  }

  const domainWorkflows: Array<{
    workflowKey: string;
    name: string;
    description: string;
    resourceType: string;
    processCategory: string;
    states: Array<{ key: string; name: string; type: string; slaHours?: number }>;
    transitions: Array<{
      key: string;
      name: string;
      from: string;
      to: string;
      permissions: string[];
      participants?: Array<{ type: string; ref: string }>;
    }>;
  }> = [
    {
      workflowKey: 'purchase-approval',
      name: 'Aprobación de compras',
      description: 'Flujo de aprobación de órdenes de compra de café',
      resourceType: 'purchase_order',
      processCategory: 'compras',
      states: [
        { key: 'draft', name: 'Borrador', type: 'initial' },
        { key: 'pending_approval', name: 'Pendiente aprobación', type: 'intermediate', slaHours: 24 },
        { key: 'approved', name: 'Aprobado', type: 'final' },
        { key: 'rejected', name: 'Rechazado', type: 'final' },
        { key: 'cancelled', name: 'Cancelado', type: 'cancelled' },
      ],
      transitions: [
        { key: 'submit', name: 'Enviar', from: 'draft', to: 'pending_approval', permissions: ['workflow:execute'] },
        { key: 'approve', name: 'Aprobar', from: 'pending_approval', to: 'approved', permissions: ['workflow:approve'], participants: [{ type: 'role', ref: 'manager' }] },
        { key: 'reject', name: 'Rechazar', from: 'pending_approval', to: 'rejected', permissions: ['workflow:approve'], participants: [{ type: 'role', ref: 'manager' }] },
        { key: 'cancel', name: 'Cancelar', from: '*', to: 'cancelled', permissions: ['workflow:cancel'] },
      ],
    },
    {
      workflowKey: 'quality-inspection',
      name: 'Inspección de calidad',
      description: 'Control de calidad en recepción y beneficio',
      resourceType: 'quality_batch',
      processCategory: 'calidad',
      states: [
        { key: 'scheduled', name: 'Programada', type: 'initial' },
        { key: 'in_field', name: 'En campo', type: 'intermediate', slaHours: 8 },
        { key: 'lab_review', name: 'Revisión laboratorio', type: 'intermediate', slaHours: 24 },
        { key: 'certified', name: 'Certificado', type: 'final' },
        { key: 'failed', name: 'No conforme', type: 'final' },
      ],
      transitions: [
        { key: 'start', name: 'Iniciar visita', from: 'scheduled', to: 'in_field', permissions: ['workflow:execute'] },
        { key: 'submit_lab', name: 'Enviar a laboratorio', from: 'in_field', to: 'lab_review', permissions: ['workflow:execute'] },
        { key: 'certify', name: 'Certificar', from: 'lab_review', to: 'certified', permissions: ['workflow:approve'] },
        { key: 'fail', name: 'Rechazar lote', from: 'lab_review', to: 'failed', permissions: ['workflow:approve'] },
      ],
    },
    {
      workflowKey: 'technical-visit',
      name: 'Visita técnica',
      description: 'Visitas técnicas a fincas y lotes',
      resourceType: 'field_visit',
      processCategory: 'visitas_tecnicas',
      states: [
        { key: 'planned', name: 'Planificada', type: 'initial' },
        { key: 'in_progress', name: 'En campo', type: 'intermediate', slaHours: 12 },
        { key: 'report_pending', name: 'Informe pendiente', type: 'intermediate', slaHours: 48 },
        { key: 'closed', name: 'Cerrada', type: 'final' },
      ],
      transitions: [
        { key: 'start_visit', name: 'Iniciar visita', from: 'planned', to: 'in_progress', permissions: ['workflow:execute'] },
        { key: 'complete_field', name: 'Finalizar campo', from: 'in_progress', to: 'report_pending', permissions: ['workflow:execute'] },
        { key: 'close', name: 'Cerrar visita', from: 'report_pending', to: 'closed', permissions: ['workflow:approve'] },
      ],
    },
    {
      workflowKey: 'inventory-transfer',
      name: 'Transferencia de inventario',
      description: 'Movimientos entre bodegas y almacenes',
      resourceType: 'inventory_movement',
      processCategory: 'inventario',
      states: [
        { key: 'requested', name: 'Solicitado', type: 'initial' },
        { key: 'approved', name: 'Aprobado', type: 'intermediate', slaHours: 12 },
        { key: 'in_transit', name: 'En tránsito', type: 'intermediate' },
        { key: 'received', name: 'Recibido', type: 'final' },
      ],
      transitions: [
        { key: 'request', name: 'Solicitar', from: 'requested', to: 'approved', permissions: ['workflow:execute'] },
        { key: 'dispatch', name: 'Despachar', from: 'approved', to: 'in_transit', permissions: ['workflow:execute'] },
        { key: 'receive', name: 'Confirmar recepción', from: 'in_transit', to: 'received', permissions: ['workflow:approve'] },
      ],
    },
    {
      workflowKey: 'contract-approval',
      name: 'Aprobación de contratos',
      description: 'Contratos con productores y proveedores',
      resourceType: 'contract',
      processCategory: 'contratos',
      states: [
        { key: 'draft', name: 'Borrador', type: 'initial' },
        { key: 'legal_review', name: 'Revisión legal', type: 'intermediate', slaHours: 72 },
        { key: 'signed', name: 'Firmado', type: 'final' },
        { key: 'cancelled', name: 'Cancelado', type: 'cancelled' },
      ],
      transitions: [
        { key: 'submit', name: 'Enviar a legal', from: 'draft', to: 'legal_review', permissions: ['workflow:execute'] },
        { key: 'sign', name: 'Firmar', from: 'legal_review', to: 'signed', permissions: ['workflow:approve'], participants: [{ type: 'role', ref: 'manager' }] },
        { key: 'cancel', name: 'Cancelar', from: '*', to: 'cancelled', permissions: ['workflow:cancel'] },
      ],
    },
  ];

  for (const wf of domainWorkflows) {
    const exists = await prisma.workflowDefinition.findFirst({
      where: { organizationId: demoOrg.id, workflowKey: wf.workflowKey },
    });
    if (exists) continue;

    await prisma.workflowDefinition.create({
      data: {
        organizationId: demoOrg.id,
        workflowKey: wf.workflowKey,
        name: wf.name,
        description: wf.description,
        resourceType: wf.resourceType,
        createdBy: adminUser.id,
        versions: {
          create: {
            version: 1,
            status: 'published',
            publishedAt: new Date(),
            publishedBy: adminUser.id,
            createdBy: adminUser.id,
            definition: {
              version: 1,
              settings: {
                defaultSlaHours: 48,
                processCategory: wf.processCategory,
                aiReadiness: {
                  bottleneckDetection: true,
                  routeRecommendation: true,
                  durationPrediction: true,
                },
              },
              states: wf.states,
              transitions: wf.transitions,
            },
          },
        },
      },
    });
    console.log(`✅ Domain workflow published: ${wf.workflowKey}`);
  }

  const eneacRules = [
    {
      ruleKey: 'geofence-violation-alert',
      name: 'Alerta violación geocerca',
      eventTypes: ['GeofenceViolation', 'GeofenceEntered', 'GeofenceExited'],
      eventCategory: 'geographic' as const,
      alertSeverity: 'warning' as const,
      channels: [{ channel: 'internal' }, { channel: 'push' }],
      recipients: [{ type: 'role', ref: 'manager' }],
      suppression: { windowSeconds: 600 },
    },
    {
      ruleKey: 'workflow-assignment-alert',
      name: 'Nueva asignación de proceso',
      eventTypes: ['WorkflowAssignmentCreated'],
      eventCategory: 'business' as const,
      alertSeverity: 'operational' as const,
      channels: [{ channel: 'internal' }],
      recipients: [{ type: 'dynamic', dynamic: 'event.userId' }],
    },
    {
      ruleKey: 'security-access-denied',
      name: 'Acceso denegado',
      eventTypes: ['AccessDenied'],
      eventCategory: 'security' as const,
      alertSeverity: 'critical' as const,
      channels: [{ channel: 'internal' }, { channel: 'email' }],
      recipients: [{ type: 'role', ref: 'admin' }],
      escalation: { afterMinutes: 30, increasePriority: true },
    },
    {
      ruleKey: 'producer-lifecycle-alert',
      name: 'Cambio ciclo de vida productor',
      eventTypes: ['ProducerLifecycleChanged'],
      eventCategory: 'business' as const,
      alertSeverity: 'info' as const,
      channels: [{ channel: 'internal' }],
      recipients: [{ type: 'role', ref: 'manager' }],
    },
    {
      ruleKey: 'form-submitted-alert',
      name: 'Formulario enviado',
      eventTypes: ['FormSubmitted'],
      eventCategory: 'business' as const,
      alertSeverity: 'info' as const,
      channels: [{ channel: 'internal' }],
      recipients: [{ type: 'role', ref: 'manager' }],
    },
  ];

  for (const rule of eneacRules) {
    const exists = await prisma.notificationRule.findFirst({
      where: { organizationId: demoOrg.id, ruleKey: rule.ruleKey },
    });
    if (exists) continue;

    await prisma.notificationRule.create({
      data: {
        organizationId: demoOrg.id,
        ruleKey: rule.ruleKey,
        name: rule.name,
        status: 'active',
        priority: 100,
        eventTypes: rule.eventTypes,
        eventCategory: rule.eventCategory,
        alertSeverity: rule.alertSeverity,
        channels: rule.channels,
        recipients: rule.recipients,
        suppression: rule.suppression ?? {},
        escalation: rule.escalation ?? {},
        schedule: {},
        conditions: {},
        createdBy: adminUser.id,
        aiReadiness: {
          autoPrioritization: true,
          intelligentGrouping: true,
          anomalyDetection: true,
        },
      },
    });
    console.log(`✅ ENEAC rule published: ${rule.ruleKey}`);
  }

  const demoData = {
    name: 'Parcela Demo Norte',
    code: 'PDN-001',
    area_ha: 12.5,
    active: true,
    location: { lat: 4.6097, lng: -74.0817 },
  };

  const existingResource = await prisma.resource.findFirst({
    where: { organizationId: demoOrg.id, resourceType: 'generic_entity' },
  });

  if (!existingResource) {
    await prisma.resource.create({
      data: {
        organizationId: demoOrg.id,
        resourceType: 'generic_entity',
        schemaVersion: 1,
        data: demoData,
        attributes: demoData,
        metadata: { source: 'seed', tags: ['demo', 'core-engine'] },
        status: 'active',
        syncStatus: 'synced',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
    console.log('✅ Demo generic Resource created');
  }

  const existingConfig = await prisma.resource.findFirst({
    where: { organizationId: demoOrg.id, resourceType: 'platform_config' },
  });

  if (!existingConfig) {
    const configData = {
      name: 'AGROERP Core',
      version: '0.2.0',
      environment: 'development',
    };
    await prisma.resource.create({
      data: {
        organizationId: demoOrg.id,
        resourceType: 'platform_config',
        data: configData,
        attributes: configData,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
    console.log('✅ Platform config resource created');
  }

  // Demo PRM producers
  const demoProducers = [
    {
      producerNumber: 'PRM-000001',
      producerTypeCode: 'natural',
      legalName: 'Juan Carlos Pérez García',
      firstName: 'Juan Carlos',
      lastName: 'Pérez García',
      documentTypeCode: 'CC',
      documentNumber: '80123456',
      municipalityCode: '05001',
      veredaCode: 'VER-001',
      latitude: 6.2442,
      longitude: -75.5812,
      lifecycleStatus: 'active' as const,
      categoryCode: 'A',
      yearsExperience: 15,
      qualityScore: 85,
      riskScore: 12,
      activatedAt: new Date('2024-03-15'),
    },
    {
      producerNumber: 'PRM-000002',
      producerTypeCode: 'natural',
      legalName: 'María Elena Rodríguez',
      firstName: 'María Elena',
      lastName: 'Rodríguez',
      documentTypeCode: 'CC',
      documentNumber: '52987654',
      municipalityCode: '05001',
      veredaCode: 'VER-002',
      latitude: 6.251,
      longitude: -75.5901,
      lifecycleStatus: 'active' as const,
      categoryCode: 'B',
      yearsExperience: 8,
      qualityScore: 78,
      riskScore: 20,
      activatedAt: new Date('2024-06-01'),
    },
    {
      producerNumber: 'PRM-000003',
      producerTypeCode: 'natural',
      legalName: 'Carlos Andrés Muñoz',
      firstName: 'Carlos Andrés',
      lastName: 'Muñoz',
      documentTypeCode: 'CC',
      documentNumber: '71345678',
      municipalityCode: '05615',
      veredaCode: 'VER-010',
      latitude: 6.18,
      longitude: -75.62,
      lifecycleStatus: 'pending_approval' as const,
      categoryCode: 'C',
      yearsExperience: 3,
      qualityScore: 0,
      riskScore: 35,
    },
  ];

  for (const p of demoProducers) {
    await prisma.producer.upsert({
      where: {
        organizationId_producerNumber: {
          organizationId: demoOrg.id,
          producerNumber: p.producerNumber,
        },
      },
      update: {},
      create: {
        organizationId: demoOrg.id,
        ...p,
        assignedBuyerId: adminUser.id,
        registeredAt: new Date(),
        lastActivityAt: new Date(),
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        tags: ['demo', 'cafe'],
      },
    });
  }
  console.log(`✅ ${demoProducers.length} demo producers seeded`);

  const activeSegment = await prisma.producerSegment.upsert({
    where: {
      organizationId_slug: {
        organizationId: demoOrg.id,
        slug: 'productores-activos',
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      name: 'Productores activos',
      slug: 'productores-activos',
      description: 'Productores con estado activo',
      rules: [{ field: 'lifecycleStatus', operator: 'eq', value: 'active' }],
      isDynamic: true,
      createdBy: adminUser.id,
    },
  });

  const activeProducers = await prisma.producer.findMany({
    where: { organizationId: demoOrg.id, lifecycleStatus: 'active' },
    select: { id: true },
  });
  for (const prod of activeProducers) {
    await prisma.producerSegmentMembership.upsert({
      where: {
        segmentId_producerId: {
          segmentId: activeSegment.id,
          producerId: prod.id,
        },
      },
      update: {},
      create: {
        organizationId: demoOrg.id,
        segmentId: activeSegment.id,
        producerId: prod.id,
        source: 'rule',
      },
    });
  }
  await prisma.producerSegment.update({
    where: { id: activeSegment.id },
    data: { memberCount: activeProducers.length },
  });
  console.log('✅ Demo producer segment seeded');

  const producer1 = await prisma.producer.findFirst({
    where: { organizationId: demoOrg.id, producerNumber: 'PRM-000001' },
  });
  const producer2 = await prisma.producer.findFirst({
    where: { organizationId: demoOrg.id, producerNumber: 'PRM-000002' },
  });

  const demoFarms = [
    {
      farmCode: 'FTIP-000001',
      farmName: 'Finca El Mirador',
      farmTypeCode: 'coffee_estate',
      municipalityCode: '05001',
      veredaCode: 'VER-001',
      centroidLatitude: 6.2442,
      centroidLongitude: -75.5812,
      boundaryGeo: {
        type: 'Polygon',
        coordinates: [[
          [-75.5820, 6.2435],
          [-75.5800, 6.2435],
          [-75.5800, 6.2450],
          [-75.5820, 6.2450],
          [-75.5820, 6.2435],
        ]],
      },
      totalAreaHa: 12.5,
      agriculturalAreaHa: 10.0,
      forestAreaHa: 2.5,
      tenureTypeCode: 'owned',
      status: 'active' as const,
      producerId: producer1?.id,
    },
    {
      farmCode: 'FTIP-000002',
      farmName: 'Finca La Esperanza',
      farmTypeCode: 'coffee_estate',
      municipalityCode: '05001',
      veredaCode: 'VER-002',
      centroidLatitude: 6.251,
      centroidLongitude: -75.5901,
      boundaryGeo: {
        type: 'Polygon',
        coordinates: [[
          [-75.5910, 6.2500],
          [-75.5890, 6.2500],
          [-75.5890, 6.2520],
          [-75.5910, 6.2520],
          [-75.5910, 6.2500],
        ]],
      },
      totalAreaHa: 8.3,
      agriculturalAreaHa: 7.0,
      tenureTypeCode: 'owned',
      status: 'active' as const,
      producerId: producer2?.id,
    },
    {
      farmCode: 'FTIP-000003',
      farmName: 'Finca El Roble',
      farmTypeCode: 'coffee_estate',
      municipalityCode: '05615',
      veredaCode: 'VER-010',
      centroidLatitude: 6.18,
      centroidLongitude: -75.62,
      totalAreaHa: 5.0,
      agriculturalAreaHa: 4.5,
      tenureTypeCode: 'leased',
      status: 'draft' as const,
      producerId: producer1?.id,
    },
  ];

  for (const f of demoFarms) {
    const farm = await prisma.farmUnit.upsert({
      where: {
        organizationId_farmCode: {
          organizationId: demoOrg.id,
          farmCode: f.farmCode,
        },
      },
      update: {},
      create: {
        organizationId: demoOrg.id,
        farmCode: f.farmCode,
        farmName: f.farmName,
        farmTypeCode: f.farmTypeCode,
        municipalityCode: f.municipalityCode,
        veredaCode: f.veredaCode,
        centroidLatitude: f.centroidLatitude,
        centroidLongitude: f.centroidLongitude,
        boundaryGeo: f.boundaryGeo ?? undefined,
        totalAreaHa: f.totalAreaHa,
        agriculturalAreaHa: f.agriculturalAreaHa,
        forestAreaHa: f.forestAreaHa,
        tenureTypeCode: f.tenureTypeCode,
        status: f.status,
        activatedAt: f.status === 'active' ? new Date() : undefined,
        geometryConfidence: f.boundaryGeo ? 'high' : 'low',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        tags: ['demo', 'cafe'],
        aiReadiness: {
          productionForecast: 'ready',
          riskDetection: 'ready',
          agronomicRecommendations: 'ready',
          alerts: 'ready',
        },
      },
    });

    if (f.producerId) {
      await prisma.producerTerritoryLink.upsert({
        where: {
          farmUnitId_producerId: { farmUnitId: farm.id, producerId: f.producerId },
        },
        update: {},
        create: {
          organizationId: demoOrg.id,
          farmUnitId: farm.id,
          producerId: f.producerId,
          relationshipType: 'owner',
          isPrimary: true,
          createdBy: adminUser.id,
        },
      });
    }

    const lot = await prisma.farmLot.upsert({
      where: { farmUnitId_lotCode: { farmUnitId: farm.id, lotCode: 'L-001' } },
      update: {},
      create: {
        organizationId: demoOrg.id,
        farmUnitId: farm.id,
        lotCode: 'L-001',
        lotName: 'Lote principal',
        areaHa: f.agriculturalAreaHa,
        createdBy: adminUser.id,
      },
    });

    const existingCrop = await prisma.cropStand.findFirst({
      where: { farmUnitId: farm.id, lotUnitId: lot.id },
    });
    if (!existingCrop) {
      await prisma.cropStand.create({
        data: {
          organizationId: demoOrg.id,
          farmUnitId: farm.id,
          lotUnitId: lot.id,
          speciesCode: 'coffee',
          varietyCodes: ['castillo', 'caturra'],
          densityPlantsHa: 5000,
          estimatedYieldKgHa: 1800,
          status: 'active',
          createdBy: adminUser.id,
        },
      });
    }

    await prisma.farmDigitalTwin.upsert({
      where: { farmUnitId: farm.id },
      update: { lastRefreshedAt: new Date() },
      create: {
        organizationId: demoOrg.id,
        farmUnitId: farm.id,
        statusSummary: f.status,
        producerPrimaryId: f.producerId,
        totalAreaHa: f.totalAreaHa,
        agriculturalAreaHa: f.agriculturalAreaHa,
        lotCount: 1,
        activeCropStandCount: 1,
      },
    });

    const existingFieldLot = await prisma.fieldLotProfile.findFirst({
      where: {
        OR: [
          { ftipLotUnitId: lot.id },
          { organizationId: demoOrg.id, lotCode: lot.lotCode },
        ],
      },
    });

    const fieldLot = existingFieldLot
      ? await prisma.fieldLotProfile.update({
          where: { id: existingFieldLot.id },
          data: {
            ftipLotUnitId: lot.id,
            farmUnitId: farm.id,
            status: 'active',
            activatedAt: new Date(),
            responsibleProducerId: f.producerId,
          },
        })
      : await prisma.fieldLotProfile.create({
          data: {
            organizationId: demoOrg.id,
            ftipLotUnitId: lot.id,
            farmUnitId: farm.id,
            lotCode: lot.lotCode,
            lotName: lot.lotName ?? `Lote ${lot.lotCode}`,
            lotTypeCode: 'productive',
            totalAreaHa: lot.areaHa,
            cultivableAreaHa: lot.areaHa,
            plantedAreaHa: lot.areaHa,
            status: 'active',
            activatedAt: new Date(),
            responsibleProducerId: f.producerId,
            centroidLatitude: f.centroidLatitude,
            centroidLongitude: f.centroidLongitude,
            createdBy: adminUser.id,
            updatedBy: adminUser.id,
            aiReadiness: {
              harvestForecast: 'ready',
              anomalyDetection: 'ready',
              agronomicRecommendations: 'ready',
              phytosanitaryRisk: 'ready',
            },
          },
        });

    const hasAgState = await prisma.lotAgronomicState.findFirst({
      where: { fieldLotId: fieldLot.id, effectiveUntil: null },
    });
    if (!hasAgState) {
      await prisma.lotAgronomicState.create({
        data: {
          organizationId: demoOrg.id,
          fieldLotId: fieldLot.id,
          primaryCropCode: 'coffee',
          varietyCodes: ['castillo', 'caturra'],
          densityPlantsHa: 5000,
          expectedYieldKgHa: 1800,
          productionSystemCode: 'conventional',
          createdBy: adminUser.id,
        },
      });
    }

    await prisma.lotDigitalTwin.upsert({
      where: { fieldLotId: fieldLot.id },
      update: { lastRefreshedAt: new Date() },
      create: {
        organizationId: demoOrg.id,
        fieldLotId: fieldLot.id,
        statusSummary: 'active',
        varietySummary: 'castillo, caturra',
        expectedYieldKgHa: 1800,
        operationsCountYtd: 0,
        compliancePct: 60,
      },
    });

    await prisma.lotRecommendation.create({
      data: {
        organizationId: demoOrg.id,
        fieldLotId: fieldLot.id,
        insightType: 'fertilization',
        title: 'Aplicar fertilización foliar según análisis',
        payload: { doseKgHa: 2.5, product: 'NPK 10-30-10' },
        confidence: 0.82,
        status: 'pending',
      },
    }).catch(() => undefined);
  }
  console.log(`✅ ${demoFarms.length} demo farms seeded`);

  const dashboardLabels: Record<string, string> = {
    executive: 'Dashboard Ejecutivo',
    financial: 'Dashboard Financiero',
    commercial: 'Dashboard Comercial',
    operational: 'Dashboard Operativo',
    agronomic: 'Dashboard Agronómico',
    purchases: 'Dashboard Compras',
    inventory: 'Dashboard Inventario',
    quality: 'Dashboard Calidad',
    producers: 'Dashboard Productores',
    gis: 'Dashboard GIS',
    ai: 'Dashboard IA',
    custom: 'Dashboard Personalizable',
  };

  for (const category of BI_DASHBOARD_CATEGORIES) {
    const key = `system-${category}`;
    const exists = await prisma.biDashboard.findFirst({
      where: { organizationId: demoOrg.id, dashboardKey: key },
    });
    if (exists) continue;

    const definition = {
      version: 1,
      widgets: [
        { id: `${category}-kpi-1`, type: 'kpi', title: 'Indicador principal', x: 0, y: 0, w: 3, h: 2, query: { dataSource: 'producers', aggregations: [{ field: 'id', fn: 'count', alias: 'total' }] } },
        { id: `${category}-bar-1`, type: 'bar', title: 'Distribución', x: 3, y: 0, w: 6, h: 3, query: { dataSource: category === 'agronomic' ? 'lots' : 'producers', groupBy: [category === 'agronomic' ? 'cropCode' : 'lifecycleStatus'], aggregations: [{ field: 'id', fn: 'count', alias: 'count' }] } },
        { id: `${category}-table-1`, type: 'table', title: 'Detalle', x: 0, y: 3, w: 9, h: 3, query: { dataSource: 'producers', limit: 10 } },
      ],
      settings: { refreshIntervalSec: 60, aiReadiness: { prediction: true, anomalyDetection: true } },
    };

    await prisma.biDashboard.create({
      data: {
        organizationId: demoOrg.id,
        dashboardKey: key,
        name: dashboardLabels[category] ?? `Dashboard ${category}`,
        description: `Dashboard de sistema — ${category}`,
        category,
        status: 'published',
        isSystem: true,
        layout: definition,
        settings: definition.settings,
        createdBy: adminUser.id,
        versions: {
          create: {
            version: 1,
            status: 'published',
            definition,
            publishedAt: new Date(),
            publishedBy: adminUser.id,
            createdBy: adminUser.id,
          },
        },
      },
    });
    console.log(`✅ EBIAP dashboard: ${key}`);
  }

  const demoKpis = [
    { kpiKey: 'total-producers', name: 'Total Productores', targetValue: 100, unit: 'prod', queryDef: { dataSource: 'producers', aggregations: [{ field: 'id', fn: 'count', alias: 'value' }] } },
    { kpiKey: 'active-lots', name: 'Lotes Activos', targetValue: 50, unit: 'lotes', queryDef: { dataSource: 'lots', filters: [{ field: 'lifecycleStatus', operator: 'eq', value: 'active' }], aggregations: [{ field: 'id', fn: 'count', alias: 'value' }] } },
    { kpiKey: 'active-workflows', name: 'Procesos Activos', targetValue: 20, unit: 'proc', queryDef: { dataSource: 'workflows', filters: [{ field: 'status', operator: 'eq', value: 'active' }], aggregations: [{ field: 'id', fn: 'count', alias: 'value' }] } },
    { kpiKey: 'ai-recommendations', name: 'Recomendaciones IA', targetValue: 10, unit: 'rec', color: '#6366f1', queryDef: { dataSource: 'lot_twins', aggregations: [{ field: 'fieldLotId', fn: 'count', alias: 'value' }] } },
  ];

  for (const kpi of demoKpis) {
    const exists = await prisma.biKpiDefinition.findFirst({
      where: { organizationId: demoOrg.id, kpiKey: kpi.kpiKey },
    });
    if (exists) continue;
    const created = await prisma.biKpiDefinition.create({
      data: {
        organizationId: demoOrg.id,
        kpiKey: kpi.kpiKey,
        name: kpi.name,
        targetValue: kpi.targetValue,
        unit: kpi.unit,
        color: kpi.color ?? '#1b5e3b',
        queryDef: kpi.queryDef,
        frequency: 'daily',
        alertRules: [{ operator: 'lt', threshold: kpi.targetValue * 0.8, severity: 'warning' }],
        createdBy: adminUser.id,
      },
    });
    await prisma.biKpiHistory.create({
      data: {
        kpiId: created.id,
        value: kpi.targetValue * 0.85,
        targetValue: kpi.targetValue,
        variancePct: -15,
      },
    });
    console.log(`✅ EBIAP KPI: ${kpi.kpiKey}`);
  }

  const demoReport = await prisma.biReportDefinition.findFirst({
    where: { organizationId: demoOrg.id, reportKey: 'producers-summary' },
  });
  if (!demoReport) {
    await prisma.biReportDefinition.create({
      data: {
        organizationId: demoOrg.id,
        reportKey: 'producers-summary',
        name: 'Resumen de Productores',
        description: 'Reporte universal de productores',
        status: 'published',
        queryDef: { dataSource: 'producers', limit: 500 },
        columns: [
          { key: 'producerNumber', label: 'Número' },
          { key: 'legalName', label: 'Nombre' },
          { key: 'lifecycleStatus', label: 'Estado' },
        ],
        createdBy: adminUser.id,
      },
    });
    console.log('✅ EBIAP report: producers-summary');
  }

  const enterpriseProvider = await prisma.aiProviderConfig.findFirst({
    where: { organizationId: demoOrg.id, providerKey: 'enterprise' },
  });
  if (!enterpriseProvider) {
    const provider = await prisma.aiProviderConfig.create({
      data: {
        organizationId: demoOrg.id,
        providerKey: 'enterprise',
        providerType: 'custom',
        name: 'AGROERP Enterprise AI',
        isDefault: true,
        isActive: true,
        settings: { mode: 'erp-grounded' },
        createdBy: adminUser.id,
        models: {
          create: {
            organizationId: demoOrg.id,
            modelKey: 'agroerp-enterprise',
            displayName: 'AGROERP Enterprise',
            modelType: 'chat',
            capabilities: ['chat', 'completion', 'summarization', 'recommendation', 'explanation'],
            isDefault: true,
            costPer1kIn: 0,
            costPer1kOut: 0,
          },
        },
      },
    });
    console.log(`✅ EAIDSP provider: ${provider.providerKey}`);
  }

  const copilots = [
    { key: 'management', category: 'management' as const, name: 'Copiloto Gerencia', perms: ['analytics:read'] },
    { key: 'purchases', category: 'purchases' as const, name: 'Copiloto Compras', perms: [] },
    { key: 'finance', category: 'finance' as const, name: 'Copiloto Finanzas', perms: ['analytics:read'] },
    { key: 'inventory', category: 'inventory' as const, name: 'Copiloto Inventario', perms: [] },
    { key: 'quality', category: 'quality' as const, name: 'Copiloto Calidad', perms: [] },
    { key: 'laboratory', category: 'laboratory' as const, name: 'Copiloto Laboratorio', perms: [] },
    { key: 'producers', category: 'producers' as const, name: 'Copiloto Productores', perms: ['producer:read'] },
    { key: 'field', category: 'field_technician' as const, name: 'Copiloto Técnico de Campo', perms: ['lot:read', 'farm:read'] },
    { key: 'logistics', category: 'logistics' as const, name: 'Copiloto Logística', perms: [] },
    { key: 'hr', category: 'hr' as const, name: 'Copiloto RRHH', perms: ['user:read'] },
    { key: 'admin', category: 'system_admin' as const, name: 'Copiloto Administrador', perms: ['ai:admin'] },
  ];

  for (const cp of copilots) {
    const exists = await prisma.aiCopilotDefinition.findFirst({
      where: { organizationId: demoOrg.id, copilotKey: cp.key },
    });
    if (exists) continue;
    await prisma.aiCopilotDefinition.create({
      data: {
        organizationId: demoOrg.id,
        copilotKey: cp.key,
        name: cp.name,
        category: cp.category,
        systemPrompt: `Eres el copiloto de ${cp.name} de AGROERP. Responde con contexto ERP y datos organizacionales.`,
        modelKey: 'agroerp-enterprise',
        permissions: cp.perms,
        contextScopes: ['erp', 'rag', cp.category],
        createdBy: adminUser.id,
      },
    });
    console.log(`✅ EAIDSP copilot: ${cp.key}`);
  }

  const promptExists = await prisma.aiPromptTemplate.findFirst({
    where: { organizationId: demoOrg.id, promptKey: 'executive-summary' },
  });
  if (!promptExists) {
    await prisma.aiPromptTemplate.create({
      data: {
        organizationId: demoOrg.id,
        promptKey: 'executive-summary',
        name: 'Resumen Ejecutivo',
        serviceType: 'summarization',
        status: 'active',
        variables: [{ key: 'period', label: 'Período' }],
        createdBy: adminUser.id,
        versions: {
          create: {
            version: 1,
            status: 'active',
            template: 'Genera un resumen ejecutivo para el período {{period}} con KPIs principales.',
            systemPrompt: 'Responde en español con datos de AGROERP.',
            publishedAt: new Date(),
            createdBy: adminUser.id,
          },
        },
      },
    });
    console.log('✅ EAIDSP prompt: executive-summary');
  }

  const existingOrgQuota = await prisma.aiUsageQuota.findFirst({
    where: { organizationId: demoOrg.id, scope: 'org', scopeRef: null },
  });
  if (!existingOrgQuota) {
    await prisma.aiUsageQuota.create({
      data: {
        organizationId: demoOrg.id,
        scope: 'org',
        dailyLimit: 5000,
        monthlyLimit: 100000,
        resetAt: new Date(Date.now() + 24 * 3600000),
      },
    });
  }

  const connectorTypes = [
    { key: 'dian-facturacion', type: 'dian' as const, name: 'DIAN Facturación Electrónica' },
    { key: 'bancolombia-pse', type: 'bank' as const, name: 'Bancolombia PSE' },
    { key: 'stripe-payments', type: 'payment_gateway' as const, name: 'Stripe Pagos' },
    { key: 'sendgrid-email', type: 'email' as const, name: 'SendGrid Email' },
    { key: 'twilio-sms', type: 'sms' as const, name: 'Twilio SMS' },
    { key: 'whatsapp-business', type: 'whatsapp' as const, name: 'WhatsApp Business' },
    { key: 'openweather', type: 'weather' as const, name: 'OpenWeather Meteorología' },
    { key: 'sap-erp', type: 'external_erp' as const, name: 'SAP ERP Externo' },
    { key: 'salesforce-crm', type: 'crm' as const, name: 'Salesforce CRM' },
    { key: 'iot-sensors', type: 'iot' as const, name: 'Plataforma IoT Sensores' },
    { key: 'keycloak-auth', type: 'auth_provider' as const, name: 'Keycloak OIDC' },
  ];

  for (const c of connectorTypes) {
    const exists = await prisma.apiConnector.findFirst({
      where: { organizationId: demoOrg.id, connectorKey: c.key },
    });
    if (exists) continue;
    await prisma.apiConnector.create({
      data: {
        organizationId: demoOrg.id,
        connectorKey: c.key,
        connectorType: c.type,
        name: c.name,
        authType: 'api_key',
        isActive: true,
        settings: { sandbox: true },
        createdBy: adminUser.id,
      },
    });
    console.log(`✅ EAMIP connector: ${c.key}`);
  }

  const apiDefs = [
    {
      apiKey: 'prm-producers',
      name: 'API Productores',
      domain: 'prm',
      moduleRef: 'prm',
      basePath: '/gateway/v1/prm-producers',
      routes: [
        { routeKey: 'list-producers', method: 'GET', path: '/v1/producers', upstreamPath: '/api/v1/prm/producers', moduleRef: 'prm' },
        { routeKey: 'get-producer', method: 'GET', path: '/v1/producers/:id', upstreamPath: '/api/v1/prm/producers/:id', moduleRef: 'prm' },
      ],
    },
    {
      apiKey: 'ebiap-analytics',
      name: 'API Business Intelligence',
      domain: 'analytics',
      moduleRef: 'ebiap',
      basePath: '/gateway/v1/ebiap-analytics',
      routes: [
        { routeKey: 'bi-center', method: 'GET', path: '/v1/center', upstreamPath: '/api/v1/ebiap/center', moduleRef: 'ebiap' },
      ],
    },
    {
      apiKey: 'eaidsp-ai',
      name: 'API Inteligencia Artificial',
      domain: 'ai',
      moduleRef: 'eaidsp',
      basePath: '/gateway/v1/eaidsp-ai',
      routes: [
        { routeKey: 'ai-copilots', method: 'GET', path: '/v1/copilots', upstreamPath: '/api/v1/eaidsp/copilots', moduleRef: 'eaidsp' },
      ],
    },
  ];

  for (const def of apiDefs) {
    const exists = await prisma.apiDefinition.findFirst({
      where: { organizationId: demoOrg.id, apiKey: def.apiKey },
    });
    if (exists) continue;

    const api = await prisma.apiDefinition.create({
      data: {
        organizationId: demoOrg.id,
        apiKey: def.apiKey,
        name: def.name,
        domain: def.domain,
        moduleRef: def.moduleRef,
        basePath: def.basePath,
        status: 'published',
        isPublic: true,
        publishedAt: new Date(),
        tags: [def.domain, 'enterprise'],
        openApiSpec: { openapi: '3.0.3', info: { title: def.name, version: 'v1' } },
        createdBy: adminUser.id,
        versions: {
          create: {
            organizationId: demoOrg.id,
            version: 'v1',
            status: 'published',
            publishedAt: new Date(),
            openApiSpec: { openapi: '3.0.3', info: { title: def.name, version: 'v1' } },
            createdBy: adminUser.id,
          },
        },
        routes: {
          create: def.routes.map((r) => ({
            organizationId: demoOrg.id,
            routeKey: r.routeKey,
            method: r.method,
            path: r.path,
            upstreamPath: r.upstreamPath,
            moduleRef: r.moduleRef,
          })),
        },
      },
    });
    console.log(`✅ EAMIP API: ${api.apiKey}`);
  }

  const demoClient = await prisma.apiClient.findFirst({
    where: { organizationId: demoOrg.id, clientKey: 'demo-mobile' },
  });
  if (!demoClient) {
    const client = await prisma.apiClient.create({
      data: {
        organizationId: demoOrg.id,
        clientKey: 'demo-mobile',
        name: 'Cliente Demo Mobile',
        description: 'App Android PRM',
        status: 'active',
        scopes: ['prm:read', 'analytics:read', 'ai:read', '*'],
        rateLimitPerMinute: 300,
        rateLimitPerDay: 100000,
        createdBy: adminUser.id,
      },
    });
    console.log(`✅ EAMIP client: ${client.clientKey}`);
  }

  // EIAMP — security policies, row/field policies, SSO
  await prisma.iamSecurityPolicy.upsert({
    where: { organizationId: demoOrg.id },
    update: { allowedHours: {} },
    create: {
      organizationId: demoOrg.id,
      minPasswordLength: 10,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      passwordExpiryDays: 90,
      passwordHistoryCount: 5,
      maxFailedAttempts: 5,
      lockoutMinutes: 30,
      sessionTimeoutMinutes: 480,
      mfaRequired: false,
      allowedCountries: ['CO', 'EC', 'PE'],
      allowedIpRanges: [],
      blockedIpRanges: [],
      allowedHours: {},
    },
  });

  await prisma.iamRowPolicy.upsert({
    where: {
      organizationId_resourceType_policyKey: {
        organizationId: demoOrg.id,
        resourceType: 'farm',
        policyKey: 'farm-scope-agent',
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      resourceType: 'farm',
      policyKey: 'farm-scope-agent',
      effect: 'allow',
      attribute: 'organizationId',
      operator: 'eq',
      value: demoOrg.id,
      roles: [SYSTEM_ROLES.FIELD_AGENT],
    },
  });

  await prisma.iamFieldPolicy.upsert({
    where: {
      organizationId_resourceType_fieldPath: {
        organizationId: demoOrg.id,
        resourceType: 'producer',
        fieldPath: 'documentNumber',
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      resourceType: 'producer',
      fieldPath: 'documentNumber',
      effect: 'deny',
      roles: [SYSTEM_ROLES.FIELD_AGENT],
      permissions: ['producer:read'],
      conditions: { maskPattern: '****{last4}' },
    },
  });

  const ssoExisting = await prisma.iamSsoProvider.findFirst({
    where: { organizationId: demoOrg.id, providerKey: 'oidc-demo' },
  });
  if (!ssoExisting) {
    await prisma.iamSsoProvider.create({
      data: {
        organizationId: demoOrg.id,
        providerKey: 'oidc-demo',
        providerType: 'oidc',
        name: 'OIDC Demo Provider',
        issuerUrl: 'https://login.microsoftonline.com/common/v2.0',
        clientId: 'demo-client-id',
        isActive: true,
      },
    });
  }

  const oauthExisting = await prisma.iamOAuthClient.findFirst({
    where: { organizationId: demoOrg.id, clientId: 'eiamp-demo-client' },
  });
  if (!oauthExisting) {
    await prisma.iamOAuthClient.create({
      data: {
        organizationId: demoOrg.id,
        clientId: 'eiamp-demo-client',
        clientSecretHash: await bcrypt.hash('eiamp-demo-secret', 12),
        name: 'EIAMP Demo OAuth Client',
        grantTypes: ['client_credentials'],
        scopes: ['iam:read', 'prm:read'],
        isActive: true,
      },
    });
    console.log('✅ EIAMP OAuth client: eiamp-demo-client');
  }

  console.log('✅ EIAMP security policies seeded');

  // EBRE — Business Rules Engine demo
  const breGroup = await prisma.breRuleGroup.upsert({
    where: {
      organizationId_groupKey: { organizationId: demoOrg.id, groupKey: 'agro-core' },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      groupKey: 'agro-core',
      name: 'Reglas Agroindustriales',
      description: 'Reglas transversales productores, fincas y lotes',
      sortOrder: 10,
    },
  });

  const qualityTable = await prisma.breDecisionTable.upsert({
    where: {
      organizationId_tableKey: { organizationId: demoOrg.id, tableKey: 'coffee-quality-tier' },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      tableKey: 'coffee-quality-tier',
      name: 'Clasificación calidad café',
      inputs: [{ key: 'qualityScore', type: 'number' }],
      outputs: [{ key: 'tier', type: 'string' }, { key: 'alert', type: 'boolean' }],
      rows: [
        { inputs: { qualityScore: '>90' }, outputs: { tier: 'premium', alert: false }, priority: 10 },
        { inputs: { qualityScore: '>75' }, outputs: { tier: 'standard', alert: false }, priority: 5 },
        { inputs: { qualityScore: '*' }, outputs: { tier: 'review', alert: true }, priority: 1 },
      ],
      hitPolicy: 'priority',
      createdBy: adminUser.id,
    },
  });

  const breRules = [
    {
      ruleKey: 'producer-quality-alert',
      name: 'Alerta calidad productor',
      eventTypes: ['ProducerCreated', 'ProducerUpdated'],
      eventCategory: 'producer',
      priority: 50,
      conditions: {
        all: [{ type: 'condition', field: 'payload.qualityScore', operator: 'lt', value: 60 }],
      },
      expressions: [{ key: 'riskLevel', expression: '{payload.qualityScore} * 0.1', type: 'math' }],
      actions: [{
        type: 'send_notification',
        config: { title: 'Productor baja calidad', severity: 'warning', body: 'Revisar productor' },
      }],
    },
    {
      ruleKey: 'farm-geofence-violation',
      name: 'Violación geocerca finca',
      eventTypes: ['GeofenceViolation'],
      eventCategory: 'gis',
      priority: 20,
      conditions: { all: [{ type: 'condition', field: 'geo.insideGeofence', operator: 'eq', value: false }] },
      actions: [{
        type: 'send_notification',
        config: { title: 'Geocerca violada', severity: 'critical' },
      }],
    },
    {
      ruleKey: 'lot-harvest-kpi',
      name: 'Actualizar KPI cosecha',
      eventTypes: ['HarvestRecorded'],
      eventCategory: 'lot',
      priority: 80,
      conditions: { all: [{ type: 'condition', field: 'payload.quantityKg', operator: 'gt', value: 0 }] },
      actions: [{ type: 'update_kpi', config: { kpiKey: 'harvest_volume', value: '{payload.quantityKg}' } }],
    },
    {
      ruleKey: 'workflow-sla-breach',
      name: 'SLA workflow vencido',
      eventTypes: ['WorkflowAssignmentCreated'],
      eventCategory: 'workflow',
      priority: 40,
      actions: [{ type: 'create_task', config: { stateKey: 'pending', userId: adminUser.id } }],
    },
    {
      ruleKey: 'security-access-denied',
      name: 'Acceso denegado seguridad',
      eventTypes: ['AccessDenied'],
      eventCategory: 'security',
      priority: 10,
      conditions: { all: [{ type: 'condition', field: 'payload.resource', operator: 'not_empty' }] },
      actions: [{ type: 'audit', config: { message: 'Intento de acceso denegado registrado por EBRE' } }],
    },
  ];

  for (const def of breRules) {
    await prisma.breBusinessRule.upsert({
      where: {
        organizationId_ruleKey: { organizationId: demoOrg.id, ruleKey: def.ruleKey },
      },
      update: { status: 'published', publishedAt: new Date(), publishedBy: adminUser.id },
      create: {
        organizationId: demoOrg.id,
        groupId: breGroup.id,
        ruleKey: def.ruleKey,
        name: def.name,
        status: 'published',
        priority: def.priority,
        eventTypes: def.eventTypes,
        eventCategory: def.eventCategory,
        conditions: def.conditions as object,
        expressions: (def.expressions ?? []) as object,
        actions: def.actions as object,
        publishedAt: new Date(),
        publishedBy: adminUser.id,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        decisionTableId: def.ruleKey === 'producer-quality-alert' ? qualityTable.id : undefined,
      },
    });
  }
  console.log(`✅ EBRE: ${breRules.length} reglas demo publicadas`);

  // ESDJE — Enterprise Scheduler & Distributed Job Engine demo
  const esdjeQueues = [
    { queueKey: 'default', name: 'Cola principal', moduleKey: 'core', priority: 'normal' as const },
    { queueKey: 'workflow', name: 'Cola procesos BPM', moduleKey: 'workflow', priority: 'high' as const },
    { queueKey: 'notifications', name: 'Cola notificaciones', moduleKey: 'notification', priority: 'high' as const },
    { queueKey: 'sync', name: 'Cola sincronización', moduleKey: 'sync', priority: 'normal' as const },
    { queueKey: 'finance', name: 'Cola finanzas', moduleKey: 'finance', priority: 'low' as const },
  ];

  const queueMap = new Map<string, string>();
  for (const q of esdjeQueues) {
    const row = await prisma.esdjeJobQueue.upsert({
      where: { organizationId_queueKey: { organizationId: demoOrg.id, queueKey: q.queueKey } },
      update: {},
      create: {
        organizationId: demoOrg.id,
        queueKey: q.queueKey,
        name: q.name,
        moduleKey: q.moduleKey,
        priority: q.priority,
        maxConcurrency: q.queueKey === 'workflow' ? 10 : 5,
      },
    });
    queueMap.set(q.queueKey, row.id);
  }

  await prisma.esdjeWorker.upsert({
    where: { organizationId_workerKey: { organizationId: demoOrg.id, workerKey: 'system-seed' } },
    update: { status: 'online', lastHeartbeat: new Date() },
    create: {
      organizationId: demoOrg.id,
      workerKey: 'system-seed',
      nodeId: 'seed-node',
      hostname: 'agroerp-seed',
      status: 'online',
      capacity: 20,
      modules: ['core', 'workflow', 'notification', 'ai', 'bre', 'sync', 'finance'],
    },
  });

  const esdjeJobs = [
    {
      jobKey: 'sync-pull-hourly',
      name: 'Sincronización incremental',
      jobType: 'recurring' as const,
      handlerType: 'sync.pull',
      queueKey: 'sync',
      cronExpression: '0 */1 * * *',
      payload: { entities: ['producers', 'farms', 'lots'] },
    },
    {
      jobKey: 'workflow-sla-check',
      name: 'Verificación SLA workflows',
      jobType: 'recurring' as const,
      handlerType: 'workflow.trigger',
      queueKey: 'workflow',
      cronExpression: '*/15 * * * *',
      payload: { workflowKey: 'producer_approval', action: 'sla_check' },
    },
    {
      jobKey: 'notification-digest',
      name: 'Resumen notificaciones diario',
      jobType: 'scheduled' as const,
      handlerType: 'notification.send',
      queueKey: 'notifications',
      cronExpression: '0 8 * * *',
      businessDaysOnly: true,
      payload: { channel: 'in_app', templateKey: 'daily_digest' },
    },
    {
      jobKey: 'inventory-reconcile',
      name: 'Conciliación inventario',
      jobType: 'recurring' as const,
      handlerType: 'inventory.reconcile',
      queueKey: 'default',
      cronExpression: '0 2 * * *',
      payload: { warehouseKey: 'main' },
    },
    {
      jobKey: 'finance-month-close',
      name: 'Cierre contable mensual',
      jobType: 'scheduled' as const,
      handlerType: 'finance.close',
      queueKey: 'finance',
      cronExpression: '0 6 1 * *',
      payload: { period: 'monthly' },
    },
    {
      jobKey: 'producer-created-followup',
      name: 'Seguimiento productor creado',
      jobType: 'event' as const,
      handlerType: 'bre.evaluate',
      queueKey: 'default',
      eventTypes: ['ProducerCreated'],
      payload: { ruleKey: 'producer-quality-alert' },
    },
    {
      jobKey: 'ai-usage-report',
      name: 'Reporte uso IA',
      jobType: 'recurring' as const,
      handlerType: 'ai.invoke',
      queueKey: 'default',
      cronExpression: '0 22 * * 0',
      payload: { promptKey: 'usage_summary', mode: 'report' },
    },
  ];

  for (const def of esdjeJobs) {
    const nextRun = def.cronExpression ? new Date(Date.now() + 60_000) : new Date();
    await prisma.esdjeJob.upsert({
      where: { organizationId_jobKey: { organizationId: demoOrg.id, jobKey: def.jobKey } },
      update: { status: 'pending', nextRunAt: nextRun },
      create: {
        organizationId: demoOrg.id,
        queueId: queueMap.get(def.queueKey ?? 'default'),
        jobKey: def.jobKey,
        name: def.name,
        jobType: def.jobType,
        handlerType: def.handlerType,
        status: 'pending',
        payload: (def.payload ?? {}) as object,
        cronExpression: def.cronExpression,
        timezone: 'America/Bogota',
        nextRunAt: nextRun,
        eventTypes: def.eventTypes ?? [],
        businessDaysOnly: def.businessDaysOnly ?? false,
        maxRetries: 3,
        retryStrategy: 'exponential',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
  }
  console.log(`✅ ESDJE: ${esdjeQueues.length} colas, ${esdjeJobs.length} tareas demo`);

  // EPPM — Enterprise Plugin Platform & Marketplace demo
  const signManifest = (manifest: Record<string, unknown>) => {
    const body = JSON.stringify({ ...manifest, signature: undefined });
    return createHmac('sha256', 'agroerp-eppm-dev-secret').update(body).digest('hex');
  };

  const eppmCategories = [
    { categoryKey: 'agro-modules', name: 'Módulos Agroindustriales', sortOrder: 10 },
    { categoryKey: 'integrations', name: 'Integraciones', sortOrder: 20 },
    { categoryKey: 'analytics', name: 'Reportes y BI', sortOrder: 30 },
    { categoryKey: 'mobile', name: 'Componentes Móviles', sortOrder: 40 },
    { categoryKey: 'ai', name: 'Servicios IA', sortOrder: 50 },
  ];
  for (const cat of eppmCategories) {
    await prisma.eppmPluginCategory.upsert({
      where: { categoryKey: cat.categoryKey },
      update: {},
      create: cat,
    });
  }

  const baseManifest = (overrides: Record<string, unknown>) => {
    const m = {
      apiVersion: 'agroerp.platform/v1',
      minPlatformVersion: '1.0.0',
      dependencies: [],
      permissions: [],
      extensionPoints: [],
      events: { subscribe: [], publish: [] },
      ...overrides,
    };
    return { ...m, signature: signManifest(m) };
  };

  const eppmPlugins = [
    {
      pluginKey: 'agro.coffee.procurement',
      name: 'Motor de Compras Café',
      vendor: 'AGROERP Official',
      vendorType: 'official' as const,
      pluginType: 'business_module' as const,
      categoryKey: 'agro-modules',
      tags: ['coffee', 'procurement'],
      manifest: baseManifest({
        pluginKey: 'agro.coffee.procurement',
        name: 'Motor de Compras Café',
        version: '1.0.0',
        vendor: 'AGROERP Official',
        pluginType: 'business_module',
        permissions: [{ key: 'plugin:coffee.procurement:read', scope: 'org' }],
        extensionPoints: [{ pointKey: 'core.workflow.actions', handler: 'coffee.procurement.workflow' }],
      }),
    },
    {
      pluginKey: 'agro.coffee.inventory',
      name: 'Inventario y Trazabilidad Café',
      vendor: 'AGROERP Official',
      vendorType: 'official' as const,
      pluginType: 'business_module' as const,
      categoryKey: 'agro-modules',
      tags: ['coffee', 'inventory'],
      manifest: baseManifest({
        pluginKey: 'agro.coffee.inventory',
        name: 'Inventario y Trazabilidad Café',
        version: '1.0.0',
        vendor: 'AGROERP Official',
        pluginType: 'business_module',
        dependencies: [{ pluginKey: 'agro.coffee.procurement', version: '1.0.0' }],
      }),
    },
    {
      pluginKey: 'agro.integration.sap',
      name: 'Conector SAP ERP',
      vendor: 'Partner Integraciones',
      vendorType: 'partner' as const,
      pluginType: 'connector' as const,
      categoryKey: 'integrations',
      tags: ['sap', 'erp'],
      manifest: baseManifest({
        pluginKey: 'agro.integration.sap',
        name: 'Conector SAP ERP',
        version: '2.1.0',
        vendor: 'Partner Integraciones',
        pluginType: 'connector',
        extensionPoints: [{ pointKey: 'core.api.routes', handler: 'sap.connector' }],
      }),
    },
    {
      pluginKey: 'agro.bi.harvest-dashboard',
      name: 'Dashboard Cosecha',
      vendor: 'AGROERP Official',
      vendorType: 'official' as const,
      pluginType: 'dashboard' as const,
      categoryKey: 'analytics',
      tags: ['bi', 'harvest'],
      manifest: baseManifest({
        pluginKey: 'agro.bi.harvest-dashboard',
        name: 'Dashboard Cosecha',
        version: '1.2.0',
        vendor: 'AGROERP Official',
        pluginType: 'dashboard',
        extensionPoints: [{ pointKey: 'core.dashboard.widgets', handler: 'harvest.dashboard' }],
      }),
    },
    {
      pluginKey: 'agro.mobile.field-inspector',
      name: 'Inspector de Campo Móvil',
      vendor: 'AGROERP Official',
      vendorType: 'official' as const,
      pluginType: 'mobile_component' as const,
      categoryKey: 'mobile',
      tags: ['mobile', 'field'],
      manifest: baseManifest({
        pluginKey: 'agro.mobile.field-inspector',
        name: 'Inspector de Campo Móvil',
        version: '1.0.0',
        vendor: 'AGROERP Official',
        pluginType: 'mobile_component',
        mobile: { screens: [{ key: 'field_inspector', title: 'Inspector' }] },
      }),
    },
    {
      pluginKey: 'agro.ai.yield-predictor',
      name: 'Predictor de Rendimiento IA',
      vendor: 'AGROERP AI Labs',
      vendorType: 'official' as const,
      pluginType: 'ai_service' as const,
      categoryKey: 'ai',
      tags: ['ai', 'yield'],
      manifest: baseManifest({
        pluginKey: 'agro.ai.yield-predictor',
        name: 'Predictor de Rendimiento IA',
        version: '0.9.0',
        vendor: 'AGROERP AI Labs',
        pluginType: 'ai_service',
        extensionPoints: [{ pointKey: 'core.ai.agents', handler: 'yield.predictor' }],
      }),
    },
  ];

  for (const def of eppmPlugins) {
    const manifest = def.manifest as Record<string, unknown>;
    const plugin = await prisma.eppmPluginPackage.upsert({
      where: { pluginKey: def.pluginKey },
      update: {
        status: 'published',
        publishedAt: new Date(),
        signatureVerified: true,
        signatureHash: manifest.signature as string,
        currentVersion: (manifest.version as string) ?? '1.0.0',
      },
      create: {
        pluginKey: def.pluginKey,
        name: def.name,
        vendor: def.vendor,
        vendorType: def.vendorType,
        pluginType: def.pluginType,
        categoryKey: def.categoryKey,
        status: 'published',
        visibility: 'public',
        manifest: manifest as object,
        tags: def.tags,
        license: 'AGROERP-Enterprise',
        compatibility: { minPlatform: '1.0.0' },
        signatureHash: manifest.signature as string,
        signatureVerified: true,
        publishedAt: new Date(),
        createdBy: adminUser.id,
        currentVersion: (manifest.version as string) ?? '1.0.0',
        downloadCount: Math.floor(Math.random() * 500) + 50,
        ratingAvg: 4.2 + Math.random() * 0.7,
        ratingCount: Math.floor(Math.random() * 30) + 5,
      },
    });
    await prisma.eppmPluginVersion.upsert({
      where: { pluginId_version: { pluginId: plugin.id, version: manifest.version as string } },
      update: { manifest: manifest as object, signatureHash: manifest.signature as string },
      create: {
        pluginId: plugin.id,
        version: manifest.version as string,
        manifest: manifest as object,
        dependencies: (manifest.dependencies ?? []) as object,
        signatureHash: manifest.signature as string,
      },
    });
  }

  const procurement = await prisma.eppmPluginPackage.findUnique({
    where: { pluginKey: 'agro.coffee.procurement' },
  });
  const harvestDash = await prisma.eppmPluginPackage.findUnique({
    where: { pluginKey: 'agro.bi.harvest-dashboard' },
  });
  if (procurement) {
    await prisma.eppmPluginInstall.upsert({
      where: { organizationId_pluginKey: { organizationId: demoOrg.id, pluginKey: procurement.pluginKey } },
      update: { status: 'enabled' },
      create: {
        organizationId: demoOrg.id,
        pluginId: procurement.id,
        pluginKey: procurement.pluginKey,
        installedVersion: '1.0.0',
        status: 'enabled',
        enabledAt: new Date(),
        installedBy: adminUser.id,
        autoUpdate: true,
      },
    });
  }
  if (harvestDash) {
    await prisma.eppmPluginInstall.upsert({
      where: { organizationId_pluginKey: { organizationId: demoOrg.id, pluginKey: harvestDash.pluginKey } },
      update: { status: 'enabled' },
      create: {
        organizationId: demoOrg.id,
        pluginId: harvestDash.id,
        pluginKey: harvestDash.pluginKey,
        installedVersion: '1.2.0',
        status: 'enabled',
        enabledAt: new Date(),
        installedBy: adminUser.id,
      },
    });
  }
  console.log(`✅ EPPM: ${eppmCategories.length} categorías, ${eppmPlugins.length} plugins marketplace`);

  // EIESDP — Enterprise IoT, Edge & Smart Devices Platform demo
  const iotGroup = await prisma.eiesdpDeviceGroup.upsert({
    where: { organizationId_groupKey: { organizationId: demoOrg.id, groupKey: 'field-sensors' } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      groupKey: 'field-sensors',
      name: 'Sensores de Campo',
      description: 'Red IoT fincas y lotes',
      tags: ['coffee', 'field'],
    },
  });

  const farm = await prisma.farmUnit.findFirst({ where: { organizationId: demoOrg.id } });
  const lot = await prisma.fieldLotProfile.findFirst({ where: { organizationId: demoOrg.id } });

  const iotDevices = [
    { deviceKey: 'scale-warehouse-01', name: 'Balanza Acopio Principal', deviceType: 'electronic_scale' as const, protocol: 'modbus' as const, lat: 4.71, lng: -74.07 },
    { deviceKey: 'temp-silo-01', name: 'Sensor Temperatura Silo', deviceType: 'temperature_sensor' as const, protocol: 'mqtt' as const, lat: 4.712, lng: -74.072 },
    { deviceKey: 'humidity-lot-a', name: 'Humedad Lote A', deviceType: 'humidity_sensor' as const, protocol: 'mqtt' as const },
    { deviceKey: 'weather-station-01', name: 'Estación Meteorológica Finca', deviceType: 'weather_station' as const, protocol: 'mqtt' as const, lat: 4.715, lng: -74.075 },
    { deviceKey: 'gps-truck-01', name: 'GPS Vehículo Recolección', deviceType: 'gps_tracker' as const, protocol: 'http' as const },
    { deviceKey: 'ble-soil-01', name: 'Sensor Suelo BLE', deviceType: 'soil_sensor' as const, protocol: 'bluetooth' as const },
    { deviceKey: 'rfid-gate-01', name: 'Lector RFID Portería', deviceType: 'rfid_reader' as const, protocol: 'tcp' as const },
    { deviceKey: 'energy-main', name: 'Medidor Energía Principal', deviceType: 'energy_meter' as const, protocol: 'modbus' as const },
  ];

  for (const def of iotDevices) {
    const device = await prisma.eiesdpDevice.upsert({
      where: { organizationId_deviceKey: { organizationId: demoOrg.id, deviceKey: def.deviceKey } },
      update: { status: 'active', lastSeenAt: new Date(), latitude: def.lat, longitude: def.lng },
      create: {
        organizationId: demoOrg.id,
        groupId: iotGroup.id,
        deviceKey: def.deviceKey,
        name: def.name,
        deviceType: def.deviceType,
        protocol: def.protocol,
        status: 'active',
        activatedAt: new Date(),
        lastSeenAt: new Date(),
        latitude: def.lat,
        longitude: def.lng,
        batteryLevel: 60 + Math.floor(Math.random() * 40),
        signalQuality: 70 + Math.floor(Math.random() * 30),
        firmwareVersion: '1.2.0',
        farmId: farm?.id,
        lotId: lot?.id,
        mqttTopic: `agroerp/${demoOrg.id}/${def.deviceKey}/telemetry`,
        createdBy: adminUser.id,
      },
    });
    await prisma.eiesdpDigitalTwin.upsert({
      where: { deviceId: device.id },
      update: {},
      create: { deviceId: device.id, reportedState: { online: true } },
    });
    await prisma.eiesdpTelemetryReading.create({
      data: {
        organizationId: demoOrg.id,
        deviceId: device.id,
        deviceKey: def.deviceKey,
        metricKey:
          def.deviceType === 'electronic_scale'
            ? 'weight_kg'
            : def.deviceType.includes('temp')
              ? 'temperature_c'
              : def.deviceType.includes('humid')
                ? 'humidity_pct'
                : 'value',
        value: def.deviceType === 'electronic_scale' ? 1250 : 20 + Math.random() * 15,
        unit: def.deviceType === 'electronic_scale' ? 'kg' : def.deviceType.includes('temp') ? 'C' : '%',
        batteryLevel: device.batteryLevel ?? undefined,
        signalQuality: device.signalQuality ?? undefined,
      },
    });
    if (def.deviceType === 'electronic_scale') {
      await prisma.eiesdpDigitalTwin.update({
        where: { deviceId: device.id },
        data: {
          reportedState: { online: true, stable: true, weightKg: 1250, unit: 'kg' },
        },
      });
      await prisma.eiesdpDevice.update({
        where: { id: device.id },
        data: { metadata: { lastWeightKg: 1250, stable: true } },
      });
    }
  }

  const cpepScales: Array<{
    scaleKey: string;
    name: string;
    connectionType: 'usb' | 'serial_rs232' | 'ethernet' | 'tcp_ip' | 'bluetooth' | 'wifi' | 'iot_gateway';
    iotDeviceKey?: string;
    driverKey?: string;
    firmwareVersion?: string;
    certified: boolean;
    maxWeightKg: number;
    locationLabel?: string;
    macAddress?: string;
    serialPort?: string;
    baudRate?: number;
    host?: string;
    port?: number;
  }> = [
    {
      scaleKey: 'scale-warehouse-01',
      name: 'Balanza Acopio Principal',
      connectionType: 'ethernet',
      iotDeviceKey: 'scale-warehouse-01',
      driverKey: 'modbus-scale-v1',
      firmwareVersion: '1.2.0',
      certified: true,
      maxWeightKg: 5000,
      locationLabel: 'Báscula 1 — Acopio',
    },
    {
      scaleKey: 'scale-usb-01',
      name: 'Balanza USB Mesa',
      connectionType: 'usb',
      driverKey: 'usb-hid-scale',
      firmwareVersion: '2.0.1',
      certified: true,
      maxWeightKg: 300,
      locationLabel: 'Mesa recepción',
    },
    {
      scaleKey: 'scale-ble-01',
      name: 'Balanza Bluetooth Móvil',
      connectionType: 'bluetooth',
      driverKey: 'ble-scale',
      firmwareVersion: '1.0.4',
      certified: true,
      maxWeightKg: 200,
      macAddress: 'AA:BB:CC:DD:EE:01',
      locationLabel: 'Campo / móvil',
    },
    {
      scaleKey: 'scale-serial-01',
      name: 'Balanza Serial RS-232',
      connectionType: 'serial_rs232',
      driverKey: 'rs232-scale',
      firmwareVersion: '3.1.0',
      certified: true,
      serialPort: 'COM3',
      baudRate: 9600,
      maxWeightKg: 10000,
      locationLabel: 'Báscula industrial',
    },
    {
      scaleKey: 'scale-tcp-01',
      name: 'Balanza TCP/IP',
      connectionType: 'tcp_ip',
      driverKey: 'tcp-scale',
      firmwareVersion: '1.5.2',
      certified: true,
      host: '10.0.0.50',
      port: 4001,
      maxWeightKg: 20000,
      locationLabel: 'Patio camiones',
    },
  ];

  for (const scale of cpepScales) {
    await prisma.cpepScale.upsert({
      where: {
        organizationId_scaleKey: { organizationId: demoOrg.id, scaleKey: scale.scaleKey },
      },
      update: {
        status: 'available',
        lastSeenAt: new Date(),
        lastWeightKg: scale.scaleKey === 'scale-warehouse-01' ? 1250 : undefined,
        certified: true,
      },
      create: {
        organizationId: demoOrg.id,
        scaleKey: scale.scaleKey,
        name: scale.name,
        connectionType: scale.connectionType,
        status: 'available',
        iotDeviceKey: scale.iotDeviceKey,
        driverKey: scale.driverKey,
        firmwareVersion: scale.firmwareVersion,
        certified: scale.certified,
        certificationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        minWeightKg: 0.1,
        maxWeightKg: scale.maxWeightKg,
        precisionKg: 0.1,
        host: scale.host,
        port: scale.port,
        serialPort: scale.serialPort,
        baudRate: scale.baudRate,
        macAddress: scale.macAddress,
        locationLabel: scale.locationLabel,
        lastSeenAt: new Date(),
        lastWeightKg: scale.scaleKey === 'scale-warehouse-01' ? 1250 : undefined,
        lastStableAt: new Date(),
      },
    });
  }

  await prisma.eiesdpEdgeGateway.upsert({
    where: { organizationId_gatewayKey: { organizationId: demoOrg.id, gatewayKey: 'edge-farm-01' } },
    update: { status: 'online', lastHeartbeat: new Date() },
    create: {
      organizationId: demoOrg.id,
      gatewayKey: 'edge-farm-01',
      name: 'Edge Gateway Finca Demo',
      hostname: 'edge-farm-01.local',
      status: 'online',
    },
  });

  await prisma.eiesdpFirmwareRelease.upsert({
    where: { organizationId_releaseKey: { organizationId: demoOrg.id, releaseKey: 'temp-sensor-1.3' } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      releaseKey: 'temp-sensor-1.3',
      deviceType: 'temperature_sensor',
      version: '1.3.0',
      checksum: 'sha256:demo-checksum-eiesdp',
      releaseNotes: 'Mejoras calibración y bajo consumo',
    },
  });
  console.log(`✅ EIESDP: ${iotDevices.length} dispositivos demo, gateway edge, firmware`);

  // EIH — Enterprise Integration Hub demo
  const eihConnectors = [
    { connectorKey: 'dian-billing', name: 'DIAN Facturación Electrónica', protocol: 'soap' as const, category: 'tax_authority' as const, catalogKey: 'soap.dian' },
    { connectorKey: 'bancolombia-sftp', name: 'Banco SFTP Pagos', protocol: 'sftp' as const, category: 'bank' as const, catalogKey: 'sftp.bank' },
    { connectorKey: 'weather-openmeteo', name: 'Open-Meteo Clima', protocol: 'rest' as const, category: 'weather' as const, catalogKey: 'rest.weather' },
    { connectorKey: 'payment-gateway', name: 'Pasarela de Pago', protocol: 'rest' as const, category: 'payment_gateway' as const, catalogKey: 'rest.payment' },
    { connectorKey: 'iot-mqtt-bridge', name: 'Bridge IoT MQTT', protocol: 'message_queue' as const, category: 'iot' as const, catalogKey: 'mqtt.iot' },
  ];

  const createdConnectors: Record<string, string> = {};
  for (const def of eihConnectors) {
    const connector = await prisma.eihConnector.upsert({
      where: { organizationId_connectorKey: { organizationId: demoOrg.id, connectorKey: def.connectorKey } },
      update: { status: 'active', lastSyncAt: new Date() },
      create: {
        organizationId: demoOrg.id,
        connectorKey: def.connectorKey,
        name: def.name,
        protocol: def.protocol,
        category: def.category,
        catalogKey: def.catalogKey,
        status: 'active',
        authType: 'api_key',
        dataFormat: 'json',
        syncMode: 'scheduled',
        endpointUrl: `https://integration.agroerp.local/${def.connectorKey}`,
        createdBy: adminUser.id,
      },
    });
    createdConnectors[def.connectorKey] = connector.id;
  }

  const eihFlow = await prisma.eihIntegrationFlow.upsert({
    where: { organizationId_flowKey: { organizationId: demoOrg.id, flowKey: 'producer-to-erp' } },
    update: { status: 'published', publishedAt: new Date() },
    create: {
      organizationId: demoOrg.id,
      flowKey: 'producer-to-erp',
      name: 'Sincronización Productores → ERP',
      description: 'Flujo bidireccional productores y lotes',
      status: 'published',
      sourceConnectorId: createdConnectors['dian-billing'],
      targetConnectorId: createdConnectors['payment-gateway'],
      syncMode: 'incremental',
      scheduleCron: '0 */6 * * *',
      publishedAt: new Date(),
      createdBy: adminUser.id,
    },
  });

  await prisma.eihFlowStep.upsert({
    where: { flowId_stepKey: { flowId: eihFlow.id, stepKey: 'extract' } },
    update: {},
    create: { flowId: eihFlow.id, stepKey: 'extract', name: 'Extraer datos origen', stepOrder: 1, stepType: 'extract' },
  });
  await prisma.eihFlowStep.upsert({
    where: { flowId_stepKey: { flowId: eihFlow.id, stepKey: 'transform' } },
    update: {},
    create: { flowId: eihFlow.id, stepKey: 'transform', name: 'Transformar y mapear', stepOrder: 2, stepType: 'transform' },
  });
  await prisma.eihFlowStep.upsert({
    where: { flowId_stepKey: { flowId: eihFlow.id, stepKey: 'load' } },
    update: {},
    create: { flowId: eihFlow.id, stepKey: 'load', name: 'Cargar destino', stepOrder: 3, stepType: 'load' },
  });

  await prisma.eihFieldMapping.deleteMany({ where: { flowId: eihFlow.id } });
  await prisma.eihFieldMapping.createMany({
    data: [
      { flowId: eihFlow.id, sourceField: 'producer_name', targetField: 'name', transform: 'uppercase' },
      { flowId: eihFlow.id, sourceField: 'lot_code', targetField: 'lotCode' },
      { flowId: eihFlow.id, sourceField: 'quantity_kg', targetField: 'quantity', transform: 'number' },
    ],
  });

  const syncRun = await prisma.eihSyncRun.upsert({
    where: { organizationId_runKey: { organizationId: demoOrg.id, runKey: 'demo-sync-001' } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      flowId: eihFlow.id,
      connectorId: createdConnectors['dian-billing'],
      runKey: 'demo-sync-001',
      syncMode: 'incremental',
      status: 'completed',
      recordsIn: 150,
      recordsOut: 148,
      recordsFailed: 2,
      durationMs: 4200,
      startedAt: new Date(Date.now() - 5000),
      completedAt: new Date(),
    },
  });

  await prisma.eihSyncError.upsert({
    where: { id: '00000000-0000-4000-8000-000000000e01' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000e01',
      organizationId: demoOrg.id,
      syncRunId: syncRun.id,
      connectorId: createdConnectors['dian-billing'],
      errorKey: 'row-validation-001',
      status: 'pending',
      message: 'Campo tax_id inválido en registro 42',
      payload: { row: 42, field: 'tax_id' },
    },
  });

  await prisma.eihWebhookEndpoint.upsert({
    where: { organizationId_endpointKey: { organizationId: demoOrg.id, endpointKey: 'inbound-payments' } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      endpointKey: 'inbound-payments',
      name: 'Webhook Pagos Entrantes',
      path: '/webhooks/payments',
      connectorId: createdConnectors['payment-gateway'],
      flowId: eihFlow.id,
    },
  });

  console.log(`✅ EIH: ${eihConnectors.length} conectores, flujo producer-to-erp, sync demo`);

  // EOP — Enterprise Observability Platform demo
  await prisma.eopLogEntry.create({
    data: {
      organizationId: demoOrg.id,
      logKey: 'seed-log-001',
      level: 'info',
      component: 'backend',
      serviceName: 'backend-core',
      message: 'Operations Center seed initialized',
      attributes: { module: 'eop' },
    },
  });

  const traceId = 'seedtrace001seedtrace001seedtr01';
  await prisma.eopTraceSpan.createMany({
    data: [
      {
        organizationId: demoOrg.id,
        traceId,
        spanId: 'spanroot01',
        name: 'POST /api/v1/auth/login',
        component: 'api_gateway',
        serviceName: 'api-gateway',
        durationMs: 120,
        startedAt: new Date(Date.now() - 120),
        endedAt: new Date(),
      },
      {
        organizationId: demoOrg.id,
        traceId,
        spanId: 'spanauth01',
        parentSpanId: 'spanroot01',
        name: 'AuthService.login',
        component: 'auth',
        serviceName: 'backend-core',
        durationMs: 80,
        startedAt: new Date(Date.now() - 100),
        endedAt: new Date(Date.now() - 20),
      },
      {
        organizationId: demoOrg.id,
        traceId,
        spanId: 'spandb001',
        parentSpanId: 'spanauth01',
        name: 'SELECT users',
        component: 'database',
        serviceName: 'postgres',
        durationMs: 15,
        startedAt: new Date(Date.now() - 90),
        endedAt: new Date(Date.now() - 75),
      },
    ],
  });

  await prisma.eopMetricSample.createMany({
    data: [
      { organizationId: demoOrg.id, metricKey: 'api.latency', kind: 'latency', value: 95, unit: 'ms', serviceName: 'backend-core', apiPath: '/api/v1/auth/login' },
      { organizationId: demoOrg.id, metricKey: 'api.tps', kind: 'tps', value: 42, unit: 'rps', serviceName: 'backend-core' },
      { organizationId: demoOrg.id, metricKey: 'module.iot', kind: 'module_usage', value: 120, moduleKey: 'iot' },
      { organizationId: demoOrg.id, metricKey: 'org.active_users', kind: 'active_users', value: 8 },
    ],
  });

  await prisma.eopAlertRule.upsert({
    where: { organizationId_ruleKey: { organizationId: demoOrg.id, ruleKey: 'high-latency' } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      ruleKey: 'high-latency',
      name: 'Latencia alta API',
      severity: 'warning',
      metricKind: 'latency',
      operator: 'gt',
      threshold: 500,
      windowSeconds: 300,
    },
  });

  await prisma.eopAlert.create({
    data: {
      organizationId: demoOrg.id,
      alertKey: 'seed-alert-001',
      title: 'Latencia elevada en auth',
      message: 'Latencia promedio > 500ms en ventana de 5m',
      severity: 'warning',
      component: 'auth',
      serviceName: 'backend-core',
    },
  });

  await prisma.eopIncident.upsert({
    where: { organizationId_incidentKey: { organizationId: demoOrg.id, incidentKey: 'inc-seed-001' } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      incidentKey: 'inc-seed-001',
      title: 'Degradación intermitente Redis',
      description: 'Incidente demo Operations Center',
      status: 'investigating',
      severity: 'warning',
      component: 'redis',
      timeline: [{ at: new Date().toISOString(), action: 'opened', by: 'seed' }],
      createdBy: adminUser.id,
    },
  });

  await prisma.eopErrorEvent.create({
    data: {
      organizationId: demoOrg.id,
      errorKey: 'seed-err-001',
      component: 'integration',
      serviceName: 'integration-hub',
      message: 'Timeout conector DIAN',
      fingerprint: 'seed-fingerprint-dian-timeout',
      count: 3,
    },
  });

  await prisma.eopAiUsageMetric.create({
    data: {
      organizationId: demoOrg.id,
      modelKey: 'gpt-demo',
      provider: 'openai',
      tokensIn: 1200,
      tokensOut: 400,
      costUsd: 0.012,
      durationMs: 850,
      success: true,
      qualityScore: 0.92,
    },
  });

  await prisma.eopRumEvent.create({
    data: {
      organizationId: demoOrg.id,
      sessionId: 'seed-session-001',
      pagePath: '/operaciones',
      eventType: 'page_view',
      durationMs: 320,
      userAgent: 'seed-browser',
    },
  });

  await prisma.eopMobileTelemetry.create({
    data: {
      organizationId: demoOrg.id,
      deviceId: 'android-seed-01',
      eventType: 'performance',
      durationMs: 140,
      isOffline: false,
      appVersion: '0.1.0',
    },
  });

  await prisma.eopSyntheticCheck.upsert({
    where: { organizationId_checkKey: { organizationId: demoOrg.id, checkKey: 'health-api' } },
    update: { status: 'healthy', lastRunAt: new Date() },
    create: {
      organizationId: demoOrg.id,
      checkKey: 'health-api',
      name: 'API Health',
      targetUrl: 'http://localhost:3080/api/v1/health',
      status: 'healthy',
      latencyMs: 12,
      lastRunAt: new Date(),
    },
  });

  await prisma.eopAuditEvent.create({
    data: {
      organizationId: demoOrg.id,
      eventKey: 'seed-audit-001',
      action: 'platform_seeded',
      entityType: 'Observability',
      entityKey: 'eop',
      userId: adminUser.id,
      details: { module: 'eop' },
    },
  });

  console.log('✅ EOP: logs, traces, metrics, alerts, incidents, AI, RUM, mobile, synthetic');

  // EPOP — Enterprise Performance & Optimization Platform demo
  await prisma.epopCacheEntry.upsert({
    where: { cacheKey_layer: { cacheKey: 'demo:dashboard', layer: 'server' } },
    update: { hitCount: 12, expiresAt: new Date(Date.now() + 300_000) },
    create: {
      organizationId: demoOrg.id,
      cacheKey: 'demo:dashboard',
      layer: 'server',
      value: { warm: true },
      ttlSeconds: 300,
      hitCount: 12,
      expiresAt: new Date(Date.now() + 300_000),
    },
  });

  await prisma.epopSlowQuery.create({
    data: {
      organizationId: demoOrg.id,
      queryKey: 'seed-slow-001',
      sqlText: 'SELECT * FROM events WHERE organization_id = $1 ORDER BY recorded_at DESC',
      durationMs: 420,
      moduleKey: 'events',
      tableNames: ['events'],
      rowsExamined: 50000,
    },
  });

  await prisma.epopIndexRecommendation.upsert({
    where: { recommendationKey: 'idx_events_organization_id_created_at' },
    update: {},
    create: {
      organizationId: demoOrg.id,
      recommendationKey: 'idx_events_organization_id_created_at',
      tableName: 'events',
      columns: ['organization_id', 'created_at'],
      indexSql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_organization_id_created_at ON events (organization_id, created_at);',
      reason: 'Consultas lentas sobre events por organización',
      estimatedGainMs: 180,
      status: 'suggested',
    },
  });

  await prisma.epopPerfMetric.createMany({
    data: [
      { organizationId: demoOrg.id, metricKey: 'http.GET./api/v1/health', kind: 'response_time', value: 12, unit: 'ms', moduleKey: 'health' },
      { organizationId: demoOrg.id, metricKey: 'module.iot.latency', kind: 'module_latency', value: 45, unit: 'ms', moduleKey: 'iot' },
      { organizationId: demoOrg.id, metricKey: 'process.heap', kind: 'memory', value: 180, unit: 'MB', moduleKey: 'backend' },
    ],
  });

  await prisma.epopBenchmarkRun.upsert({
    where: { runKey: 'bench-seed-cache-warm' },
    update: {},
    create: {
      organizationId: demoOrg.id,
      runKey: 'bench-seed-cache-warm',
      name: 'Cache warm seed',
      scenario: 'cache-warm',
      status: 'completed',
      beforeMetrics: { responseTimeMs: 40 },
      afterMetrics: { responseTimeMs: 8 },
      improvementPct: 80,
      durationMs: 25,
      startedAt: new Date(Date.now() - 25),
      completedAt: new Date(),
    },
  });

  await prisma.epopBundleMetric.create({
    data: {
      organizationId: demoOrg.id,
      bundleKey: 'web-main',
      name: 'Main web bundle',
      sizeBytes: 1_468_000,
      gzipBytes: 274_000,
      chunkCount: 12,
      platform: 'web',
    },
  });

  await prisma.epopMobilePerfSample.create({
    data: {
      organizationId: demoOrg.id,
      deviceId: 'android-perf-seed',
      sampleKey: 'mobile-seed-001',
      startupMs: 890,
      memoryMb: 145,
      batteryPct: 82,
      fps: 58,
      syncMs: 120,
      listRenderMs: 16,
      offlineOps: 3,
    },
  });

  await prisma.epopMaintenanceJob.upsert({
    where: { jobKey: 'maint-cache-purge' },
    update: { isActive: true },
    create: {
      organizationId: demoOrg.id,
      jobKey: 'maint-cache-purge',
      jobType: 'cache_purge',
      scheduleCron: '*/5 * * * *',
      status: 'completed',
      lastRunAt: new Date(),
    },
  });

  await prisma.epopOptimizationAudit.create({
    data: {
      organizationId: demoOrg.id,
      action: 'platform_seeded',
      entityType: 'Performance',
      entityKey: 'epop',
      userId: adminUser.id,
      details: { module: 'epop' },
    },
  });

  console.log('✅ EPOP: cache, slow queries, indexes, metrics, benchmarks, bundles, mobile, maintenance');

  // CPEP — Café Procurement Enterprise Platform demo
  await prisma.cpepPriceConfig.upsert({
    where: { organizationId_configKey: { organizationId: demoOrg.id, configKey: 'default' } },
    update: { basePricePerKg: 12000 },
    create: {
      organizationId: demoOrg.id,
      configKey: 'default',
      name: 'Precio estándar café pergamino',
      basePricePerKg: 12000,
      withholdingPct: 1.5,
      taxRatePct: 0,
    },
  });

  const producer = await prisma.producer.findFirst({ where: { organizationId: demoOrg.id } });
  const coffeeTicket = await prisma.cpepReceptionTicket.upsert({
    where: { organizationId_ticketKey: { organizationId: demoOrg.id, ticketKey: 'RCP-SEED-001' } },
    update: { status: 'inventory_posted', netWeightKg: 1000 },
    create: {
      organizationId: demoOrg.id,
      ticketKey: 'RCP-SEED-001',
      status: 'inventory_posted',
      producerId: producer?.id,
      producerName: 'Productor Demo Café',
      identityDoc: 'CC-123456',
      identityValidated: true,
      farmName: 'Finca El Roble',
      lotCode: 'LOT-CAFE-01',
      vehiclePlate: 'XYZ789',
      turnNumber: 1,
      grossWeightKg: 1250,
      tareWeightKg: 250,
      netWeightKg: 1000,
      weightSource: 'iot',
      iotDeviceKey: 'scale-warehouse-01',
      weightValidated: true,
      qrCode: 'CPEP:RCP-SEED-001',
      barcode: 'RCPSEED001',
      receivedAt: new Date(),
      settledAt: new Date(),
      createdBy: adminUser.id,
    },
  });

  await prisma.cpepQueueTurn.upsert({
    where: { ticketId: coffeeTicket.id },
    update: {},
    create: {
      organizationId: demoOrg.id,
      ticketId: coffeeTicket.id,
      turnNumber: 1,
      priority: 100,
      isPreferential: false,
      assignmentMode: 'auto',
      displayLabel: 'T-1',
      waitMs: 180000,
      attentionMs: 420000,
      calledAt: new Date(Date.now() - 600000),
      attentionStartedAt: new Date(Date.now() - 420000),
      completedAt: new Date(),
    },
  });

  await prisma.cpepTurnEvent.create({
    data: {
      organizationId: demoOrg.id,
      ticketId: coffeeTicket.id,
      eventType: 'assigned',
      toTurn: 1,
      userId: adminUser.id,
    },
  });


  await prisma.cpepQualityAssessment.upsert({
    where: { ticketId: coffeeTicket.id },
    update: {},
    create: {
      organizationId: demoOrg.id,
      ticketId: coffeeTicket.id,
      humidityPct: 11.2,
      temperatureC: 22,
      factor: 93,
      pasillaPct: 1.1,
      brocaPct: 0.3,
      defectsPct: 1.5,
      color: 'verde oliva',
      odor: 'limpio',
      grade: 'premium',
      assessedBy: adminUser.id,
      assessedAt: new Date(),
    },
  });

  await prisma.cpepSettlement.upsert({
    where: { ticketId: coffeeTicket.id },
    update: {},
    create: {
      organizationId: demoOrg.id,
      ticketId: coffeeTicket.id,
      settlementKey: 'LIQ-RCP-SEED-001',
      basePricePerKg: 12000,
      netWeightKg: 1000,
      bonusesTotal: 100,
      penaltiesTotal: 0,
      transportTotal: 50000,
      withholdingsTotal: 180000,
      subtotal: 11_950_000,
      totalAmount: 11_770_000,
      paidAmount: 11_770_000,
      paymentStatus: 'paid',
      settledBy: adminUser.id,
      settledAt: new Date(),
      lines: [
        { code: 'BASE', label: 'Precio base', amount: 12000000 },
        { code: 'BONUS', label: 'Bonificaciones', amount: 100 },
        { code: 'TRANSPORT', label: 'Transporte', amount: -50000 },
        { code: 'WITHHOLD', label: 'Retenciones', amount: -180000 },
      ],
    },
  });

  await prisma.cpepInventoryMovement.upsert({
    where: { organizationId_movementKey: { organizationId: demoOrg.id, movementKey: 'INV-RCP-SEED-001' } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      ticketId: coffeeTicket.id,
      movementKey: 'INV-RCP-SEED-001',
      warehouse: 'Acopio principal',
      lotCode: 'LOT-CAFE-01',
      quantityKg: 1000,
      unitCost: 11770,
      totalCost: 11_770_000,
    },
  });

  await prisma.cpepDocument.upsert({
    where: { organizationId_documentKey: { organizationId: demoOrg.id, documentKey: 'settlement-RCP-SEED-001' } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      ticketId: coffeeTicket.id,
      documentKey: 'settlement-RCP-SEED-001',
      documentType: 'settlement',
      title: 'Liquidación RCP-SEED-001',
      qrPayload: 'CPEP:RCP-SEED-001',
      barcodePayload: 'RCPSEED001',
      pdfUrl: 'cpep/pdf/LIQ-RCP-SEED-001.pdf',
      signed: true,
    },
  });

  console.log('✅ CPEP: ticket recepción, calidad, liquidación, inventario, documentos');

  // CPEP catalogs & parameterization
  const catalogDefaults = [
    { catalogKey: 'coffee_type', entryKey: 'pergamino', name: 'Pergamino', code: 'PER' },
    { catalogKey: 'coffee_type', entryKey: 'cereza', name: 'Cereza', code: 'CER' },
    { catalogKey: 'variety', entryKey: 'castillo', name: 'Castillo' },
    { catalogKey: 'defect_type', entryKey: 'broca', name: 'Broca' },
    { catalogKey: 'payment_method', entryKey: 'transferencia', name: 'Transferencia' },
    { catalogKey: 'currency', entryKey: 'COP', name: 'Peso colombiano', code: 'COP' },
    { catalogKey: 'bonus', entryKey: 'premium_quality', name: 'Bonificación premium' },
    { catalogKey: 'penalty', entryKey: 'humidity_penalty', name: 'Castigo por humedad' },
    { catalogKey: 'scale', entryKey: 'scale-warehouse-01', name: 'Balanza acopio principal' },
  ];
  for (const c of catalogDefaults) {
    await prisma.cpepCatalogEntry.upsert({
      where: {
        organizationId_catalogKey_entryKey: {
          organizationId: demoOrg.id,
          catalogKey: c.catalogKey,
          entryKey: c.entryKey,
        },
      },
      update: { name: c.name, isActive: true },
      create: {
        organizationId: demoOrg.id,
        catalogKey: c.catalogKey,
        entryKey: c.entryKey,
        name: c.name,
        code: c.code,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    });
  }

  await prisma.cpepParameter.upsert({
    where: {
      organizationId_parameterKey_scopeType_scopeRef: {
        organizationId: demoOrg.id,
        parameterKey: 'humidity_ranges',
        scopeType: 'organization',
        scopeRef: '',
      },
    },
    update: { value: { min: 10, max: 12.5, rejectAbove: 14 } },
    create: {
      organizationId: demoOrg.id,
      parameterKey: 'humidity_ranges',
      name: 'Rangos de humedad',
      scopeType: 'organization',
      scopeRef: '',
      value: { min: 10, max: 12.5, rejectAbove: 14 },
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  await prisma.cpepParameter.upsert({
    where: {
      organizationId_parameterKey_scopeType_scopeRef: {
        organizationId: demoOrg.id,
        parameterKey: 'auto_bonuses',
        scopeType: 'organization',
        scopeRef: '',
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      parameterKey: 'auto_bonuses',
      name: 'Bonificaciones automáticas',
      scopeType: 'organization',
      scopeRef: '',
      value: { rules: [{ code: 'premium_quality', amount: 100, condition: { grade: 'premium' } }] },
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  const purchaseCenter = await prisma.cpepPurchaseCenter.upsert({
    where: { organizationId_centerKey: { organizationId: demoOrg.id, centerKey: 'centro_01' } },
    update: { isActive: true },
    create: {
      organizationId: demoOrg.id,
      centerKey: 'centro_01',
      name: 'Centro de compra principal',
      centerType: 'purchase',
      municipality: 'Demo',
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  await prisma.cpepReceptionRule.upsert({
    where: { organizationId_ruleKey: { organizationId: demoOrg.id, ruleKey: 'default-schedule' } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      ruleKey: 'default-schedule',
      name: 'Horario estándar',
      purchaseCenterId: purchaseCenter.id,
      openTime: '06:00',
      closeTime: '18:00',
      maxTicketsDay: 200,
      maxKgDay: 100000,
      minHumidityPct: 10,
      maxHumidityPct: 12.5,
      minFactor: 85,
      maxFactor: 100,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  await prisma.cpepConfigChangeLog.create({
    data: {
      organizationId: demoOrg.id,
      entityType: 'ConfigSeed',
      entityKey: 'cpep-config',
      action: 'seed',
      version: 1,
      newValue: { catalogs: catalogDefaults.length },
      reason: 'seed defaults',
      userId: adminUser.id,
    },
  });

  console.log(`✅ CPEP config: ${catalogDefaults.length} catálogos, parámetros, centros, reglas`);

  const waitingTicket = await prisma.cpepReceptionTicket.upsert({
    where: { organizationId_ticketKey: { organizationId: demoOrg.id, ticketKey: 'RCP-SEED-QUEUE' } },
    update: { status: 'queued', turnNumber: 2 },
    create: {
      organizationId: demoOrg.id,
      ticketKey: 'RCP-SEED-QUEUE',
      status: 'queued',
      producerName: 'Productor en cola',
      identityDoc: 'CC-999',
      identityValidated: true,
      vehiclePlate: 'QUE001',
      turnNumber: 2,
      wizardStep: 8,
      arrivalAt: new Date(),
      receivedAt: new Date(),
      qrCode: 'CPEP:RCP-SEED-QUEUE',
      barcode: 'RCPSEEDQUEUE',
      createdBy: adminUser.id,
    },
  });
  await prisma.cpepQueueTurn.upsert({
    where: { ticketId: waitingTicket.id },
    update: { isPreferential: true, priority: 1, displayLabel: 'P-2' },
    create: {
      organizationId: demoOrg.id,
      ticketId: waitingTicket.id,
      turnNumber: 2,
      priority: 1,
      isPreferential: true,
      assignmentMode: 'manual',
      displayLabel: 'P-2',
    },
  });

  console.log('✅ CPEP recepción/turnos: wizard fields, cola preferencial, eventos');

  console.log('\n🚀 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
