import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DATA_PROVIDER_TYPES, SYSTEM_ROLES } from '@agroerp/shared';

const FORM_KEY = 'registro-productor';

export const E2E_FIELD_AGENT = {
  email: 'field.agent@demo.agroerp.com',
  password: 'FieldAgent123!',
};

const E2E_PERMISSION_KEYS = [
  { resource: 'form', action: 'read' },
  { resource: 'form', action: 'submit' },
  { resource: 'producer', action: 'read' },
] as const;

const REGISTRO_PRODUCTOR_SCHEMA = {
  version: 1,
  settings: {
    offlineCapable: true,
    requireGps: true,
  },
  universalCatalogs: [
    {
      catalogKey: 'departamentos',
      displayName: 'Departamentos',
      domain: 'Ubicación',
      offlineCapable: true,
      version: '1',
    },
    {
      catalogKey: 'municipios',
      displayName: 'Municipios',
      domain: 'Ubicación',
      offlineCapable: true,
      version: '1',
      dependencies: ['departamentos'],
    },
    {
      catalogKey: 'cultivos',
      displayName: 'Cultivos',
      domain: 'Producción',
      offlineCapable: true,
      version: '1',
    },
  ],
  fields: [
    {
      key: 'nombre',
      type: 'text',
      label: 'Nombre',
      required: true,
      dataProvider: { type: DATA_PROVIDER_TYPES.MANUAL },
    },
    {
      key: 'documento',
      type: 'text',
      label: 'Documento',
      required: true,
      dataProvider: { type: DATA_PROVIDER_TYPES.MANUAL },
    },
    {
      key: 'departamento',
      type: 'select',
      label: 'Departamento',
      required: true,
      options: [],
      dataProvider: {
        type: DATA_PROVIDER_TYPES.ERP_CATALOG,
        catalogKey: 'departamentos',
      },
    },
    {
      key: 'municipio',
      type: 'select',
      label: 'Municipio',
      required: true,
      options: [],
      dataProvider: {
        type: DATA_PROVIDER_TYPES.DEPENDENT,
        catalogKey: 'municipios',
        dependsOnField: 'departamento',
      },
    },
    {
      key: 'cultivo',
      type: 'select',
      label: 'Cultivo principal',
      required: true,
      options: [],
      dataProvider: {
        type: DATA_PROVIDER_TYPES.ERP_CATALOG,
        catalogKey: 'cultivos',
      },
    },
    {
      key: 'ubicacion',
      type: 'geo',
      label: 'Ubicación GPS',
      required: true,
      dataProvider: { type: DATA_PROVIDER_TYPES.MANUAL },
    },
  ],
};

const REGISTRO_PRODUCTOR_METADATA = {
  processingType: 'PRODUCER_CREATE',
  entityMapping: {
    targetEntity: 'Producer',
    mappings: [
      {
        fieldKey: 'nombre',
        entityType: 'Producer',
        entityProperty: 'name',
      },
      {
        fieldKey: 'documento',
        entityType: 'Producer',
        entityProperty: 'documentNumber',
      },
      {
        fieldKey: 'municipio',
        entityType: 'Producer',
        entityProperty: 'municipality',
      },
      {
        fieldKey: 'cultivo',
        entityType: 'Producer',
        entityProperty: 'crop',
      },
    ],
  },
};

export async function seedE2eRegistration(prisma: PrismaClient) {
  console.log('🌱 E2E seed — Registro de Productor...');

  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-agro' },
    update: { name: 'Demo Agroindustrial' },
    create: {
      name: 'Demo Agroindustrial',
      slug: 'demo-agro',
      settings: { locale: 'es', timezone: 'America/Bogota' },
    },
  });

  const permissionIds: string[] = [];
  for (const perm of E2E_PERMISSION_KEYS) {
    const row = await prisma.permission.upsert({
      where: {
        resource_action_scope: {
          resource: perm.resource,
          action: perm.action,
          scope: 'org',
        },
      },
      update: {},
      create: {
        resource: perm.resource,
        action: perm.action,
        scope: 'org',
        description: `${perm.action} ${perm.resource}`,
        moduleId: 'core',
      },
    });
    permissionIds.push(row.id);
  }

  const fieldAgentRole = await prisma.role.upsert({
    where: {
      organizationId_slug: {
        organizationId: demoOrg.id,
        slug: SYSTEM_ROLES.FIELD_AGENT,
      },
    },
    update: { name: 'Field Agent' },
    create: {
      organizationId: demoOrg.id,
      name: 'Field Agent',
      slug: SYSTEM_ROLES.FIELD_AGENT,
      isSystem: true,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: fieldAgentRole.id } });
  if (permissionIds.length) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId: fieldAgentRole.id,
        permissionId,
      })),
    });
  }

  const passwordHash = await bcrypt.hash(E2E_FIELD_AGENT.password, 12);
  const fieldAgentUser = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: demoOrg.id,
        email: E2E_FIELD_AGENT.email,
      },
    },
    update: {
      passwordHash,
      status: 'active',
      firstName: 'Field',
      lastName: 'Agent',
    },
    create: {
      organizationId: demoOrg.id,
      email: E2E_FIELD_AGENT.email,
      passwordHash,
      firstName: 'Field',
      lastName: 'Agent',
      status: 'active',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: fieldAgentUser.id,
        roleId: fieldAgentRole.id,
      },
    },
    update: {},
    create: {
      userId: fieldAgentUser.id,
      roleId: fieldAgentRole.id,
    },
  });

  const form = await prisma.formDefinition.upsert({
    where: {
      organizationId_formKey_version: {
        organizationId: demoOrg.id,
        formKey: FORM_KEY,
        version: 1,
      },
    },
    update: {
      name: 'Registro de Productor',
      description: 'Formulario E2E — captura offline y alta en PRM',
      schema: REGISTRO_PRODUCTOR_SCHEMA,
      metadata: REGISTRO_PRODUCTOR_METADATA,
      status: 'published',
      publishedAt: new Date(),
    },
    create: {
      organizationId: demoOrg.id,
      formKey: FORM_KEY,
      name: 'Registro de Productor',
      description: 'Formulario E2E — captura offline y alta en PRM',
      version: 1,
      schema: REGISTRO_PRODUCTOR_SCHEMA,
      metadata: REGISTRO_PRODUCTOR_METADATA,
      status: 'published',
      publishedAt: new Date(),
      createdBy: fieldAgentUser.id,
    },
  });

  console.log(`✅ Organization: ${demoOrg.slug}`);
  console.log(`✅ Field Agent: ${E2E_FIELD_AGENT.email} / ${E2E_FIELD_AGENT.password}`);
  console.log(`✅ Form published: ${form.formKey} (${form.id})`);

  return {
    organizationId: demoOrg.id,
    userId: fieldAgentUser.id,
    formId: form.id,
    formKey: form.formKey,
  };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedE2eRegistration(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('E2E seed failed:', error);
    process.exit(1);
  });
}
