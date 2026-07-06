import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SYSTEM_PERMISSIONS, SYSTEM_ROLES } from '@agroerp/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding core auth (minimal)...');

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
  console.log(`✅ ${SYSTEM_PERMISSIONS.length} permissions`);

  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-agro' },
    update: {},
    create: {
      name: 'Demo Agroindustrial',
      slug: 'demo-agro',
      settings: { locale: 'es', timezone: 'America/Bogota' },
    },
  });

  const permissions = await prisma.permission.findMany();
  const adminRole = await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: demoOrg.id, slug: SYSTEM_ROLES.ADMIN } },
    update: {},
    create: {
      organizationId: demoOrg.id,
      name: 'Administrator',
      slug: SYSTEM_ROLES.ADMIN,
      isSystem: true,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  if (permissions.length) {
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
    });
  }

  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const adminUser = await prisma.user.upsert({
    where: {
      organizationId_email: { organizationId: demoOrg.id, email: 'admin@demo.agroerp.com' },
    },
    update: { passwordHash, status: 'active' },
    create: {
      organizationId: demoOrg.id,
      email: 'admin@demo.agroerp.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Demo',
      status: 'active',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  console.log('✅ Admin: admin@demo.agroerp.com / Admin123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
