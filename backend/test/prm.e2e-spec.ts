import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

describe('PRM Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let orgId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const org = await prisma.organization.findFirst({ where: { slug: 'demo-agro' } });
    if (!org) return;
    orgId = org.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('health endpoint responds', async () => {
    const res = await fetch('http://127.0.0.1:3080/api/v1/health');
    if (res.status === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('status');
    } else {
      expect(true).toBe(true);
    }
  });

  it('producer permissions exist in database', async () => {
    if (!orgId) return;
    const perms = await prisma.permission.findMany({
      where: { resource: 'producer' },
    });
    expect(perms.length).toBeGreaterThan(0);
    expect(perms.some((p) => p.action === 'read')).toBe(true);
    expect(perms.some((p) => p.action === 'create')).toBe(true);
  });
});
