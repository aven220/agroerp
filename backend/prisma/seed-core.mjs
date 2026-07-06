/**
 * Lightweight seed — no @prisma/client (avoids OOM on large schema).
 * Usage: pnpm db:seed:core
 */
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import bcrypt from 'bcrypt';

const require = createRequire(import.meta.url);
const { SYSTEM_PERMISSIONS, SYSTEM_ROLES } = require('@agroerp/shared');

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  for (const p of [resolve(__dirname, '../.env'), resolve(__dirname, '../../.env')]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
    break;
  }
}

loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString });

async function main() {
  await client.connect();
  console.log('🌱 Core seed (pg, sin Prisma client)...');

  for (const perm of SYSTEM_PERMISSIONS) {
    await client.query(
      `INSERT INTO permissions (id, resource, action, scope, description, module_id)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'core')
       ON CONFLICT (resource, action, scope) DO NOTHING`,
      [perm.resource, perm.action, perm.scope, `${perm.action} ${perm.resource}`],
    );
  }
  const permCount = await client.query('SELECT COUNT(*)::int AS c FROM permissions');
  console.log(`✅ permissions: ${permCount.rows[0].c}`);

  const orgRes = await client.query(
    `INSERT INTO organizations (id, name, slug, settings, status, created_at, updated_at)
     VALUES (gen_random_uuid(), 'Demo Agroindustrial', 'demo-agro', '{"locale":"es","timezone":"America/Bogota"}', 'active', NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  const orgId = orgRes.rows[0].id;
  console.log('✅ organization: demo-agro');

  const roleRes = await client.query(
    `INSERT INTO roles (id, organization_id, name, slug, is_system, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, 'Administrator', $2, true, NOW(), NOW())
     ON CONFLICT (organization_id, slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [orgId, SYSTEM_ROLES.ADMIN],
  );
  const roleId = roleRes.rows[0].id;

  await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
  await client.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     SELECT $1, id FROM permissions
     ON CONFLICT DO NOTHING`,
    [roleId],
  );
  console.log('✅ role: admin (all permissions)');

  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const userRes = await client.query(
    `INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, status, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, 'admin@demo.agroerp.com', $2, 'Admin', 'Demo', 'active', NOW(), NOW())
     ON CONFLICT (organization_id, email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
     RETURNING id`,
    [orgId, passwordHash],
  );
  const userId = userRes.rows[0].id;

  await client.query(
    `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, roleId],
  );

  console.log('✅ Admin: admin@demo.agroerp.com / Admin123!');
  console.log('\n🚀 Core seed completed.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e.message ?? e);
    process.exit(1);
  })
  .finally(() => client.end());
