import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  E2E_FIELD_AGENT,
  seedE2eRegistration,
} from '../../prisma/seeds/e2e-registration.seed';

describe('Registro de Productor (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;
  let authToken: string;
  let formId: string;
  let createdProducerId: string | null = null;

  const E2E_DOCUMENT = '999999999';
  const E2E_EXTERNAL_ID = 'test-e2e-001';

  async function api(
    method: string,
    path: string,
    options?: { body?: unknown; token?: string },
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options?.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
    }

    return { status: response.status, body: json };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 3080;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    prisma = app.get(PrismaService);
    await seedE2eRegistration(prisma);

    const login = await api('POST', '/auth/login', {
      body: {
        email: E2E_FIELD_AGENT.email,
        password: E2E_FIELD_AGENT.password,
      },
    });

    expect([200, 201]).toContain(login.status);
    authToken = (login.body as { accessToken: string }).accessToken;
    expect(authToken).toBeTruthy();
  });

  afterAll(async () => {
    if (createdProducerId) {
      await prisma.producer.deleteMany({
        where: { documentNumber: E2E_DOCUMENT },
      }).catch(() => undefined);
    }
    await prisma.formSubmission.deleteMany({
      where: { externalId: { in: [E2E_EXTERNAL_ID, 'test-e2e-dup-002'] } },
    }).catch(() => undefined);
    await app?.close();
  });

  it('GET /forms/published/registro-productor returns PRODUCER_CREATE metadata', async () => {
    const res = await api('GET', '/forms/published/registro-productor', {
      token: authToken,
    });

    expect(res.status).toBe(200);
    const form = res.body as {
      id: string;
      formKey: string;
      metadata?: { processingType?: string };
    };
    formId = form.id;
    expect(form.formKey).toBe('registro-productor');
    expect(form.metadata?.processingType).toBe('PRODUCER_CREATE');
  });

  it('GET /capture/mobile/package includes registro-productor', async () => {
    const res = await api('GET', '/capture/mobile/package', { token: authToken });

    expect(res.status).toBe(200);
    const body = res.body as { forms: Array<{ formKey: string }> };
    expect(body.forms.some((f) => f.formKey === 'registro-productor')).toBe(true);
  });

  it('POST /capture/sync creates submission and producer in ERP', async () => {
    expect(formId).toBeTruthy();

    const res = await api('POST', '/capture/sync', {
      token: authToken,
      body: {
        submissions: [
          {
            formId,
            externalId: E2E_EXTERNAL_ID,
            data: {
              nombre: 'Juan Perez',
              documento: E2E_DOCUMENT,
              departamento: '05',
              municipio: '05001',
              cultivo: 'cafe',
              ubicacion: { lat: 6.25, lng: -75.56, accuracy: 10 },
            },
            gpsLocation: { lat: 6.25, lng: -75.56, accuracy: 10 },
          },
        ],
        deviceInfo: { platform: 'e2e', suite: 'registro-productor' },
      },
    });

    expect([200, 201]).toContain(res.status);
    const syncBody = res.body as {
      results: Array<{ externalId: string; status: string; submissionId?: string }>;
    };
    expect(syncBody.results[0]?.status).toBe('created');
    expect(syncBody.results[0]?.submissionId).toBeTruthy();

    const submission = await prisma.formSubmission.findFirst({
      where: { externalId: E2E_EXTERNAL_ID },
    });
    expect(submission).toBeTruthy();
    expect(submission?.formId).toBe(formId);

    const producersRes = await api('GET', '/prm/producers?search=999999999', {
      token: authToken,
    });
    expect(producersRes.status).toBe(200);

    const producersBody = producersRes.body as {
      items: Array<{ id: string; documentNumber: string }>;
    };
    const producer = producersBody.items.find((p) => p.documentNumber === E2E_DOCUMENT);
    expect(producer).toBeTruthy();
    createdProducerId = producer!.id;
  });

  it('GET /entity-workspace/producer/:id returns core sections', async () => {
    expect(createdProducerId).toBeTruthy();

    const res = await api('GET', `/entity-workspace/producer/${createdProducerId}`, {
      token: authToken,
    });

    expect(res.status).toBe(200);
    const workspace = res.body as { sections: Array<{ id: string }> };
    const sectionIds = workspace.sections.map((s) => s.id);
    expect(sectionIds).toEqual(expect.arrayContaining(['summary', 'health', 'timeline', 'forms', 'analytics']));
  });

  it('GET /agricultural-timeline/producer/:id responds', async () => {
    expect(createdProducerId).toBeTruthy();

    const res = await api('GET', `/agricultural-timeline/producer/${createdProducerId}`, {
      token: authToken,
    });

    expect(res.status).toBe(200);
    const timeline = res.body as { items?: unknown[] };
    expect(Array.isArray(timeline.items)).toBe(true);
  });

  it('duplicate document stores submission but does not create second producer', async () => {
    expect(formId).toBeTruthy();

    const beforeCount = await prisma.producer.count({
      where: { documentNumber: E2E_DOCUMENT },
    });

    const res = await api('POST', '/capture/sync', {
      token: authToken,
      body: {
        submissions: [
          {
            formId,
            externalId: 'test-e2e-dup-002',
            data: {
              nombre: 'Juan Perez Duplicado',
              documento: E2E_DOCUMENT,
              departamento: '05',
              municipio: '05001',
              cultivo: 'cafe',
              ubicacion: { lat: 6.25, lng: -75.56 },
            },
            gpsLocation: { lat: 6.25, lng: -75.56 },
          },
        ],
      },
    });

    expect([200, 201]).toContain(res.status);
    const syncBody = res.body as {
      results: Array<{ externalId: string; status: string; submissionId?: string }>;
    };
    expect(syncBody.results[0]?.status).toBe('created');
    expect(syncBody.results[0]?.submissionId).toBeTruthy();

    const dupSubmission = await prisma.formSubmission.findFirst({
      where: { externalId: 'test-e2e-dup-002' },
    });
    expect(dupSubmission).toBeTruthy();
    expect(dupSubmission?.formId).toBe(formId);

    const afterCount = await prisma.producer.count({
      where: { documentNumber: E2E_DOCUMENT },
    });
    expect(afterCount).toBe(beforeCount);
  });
});
