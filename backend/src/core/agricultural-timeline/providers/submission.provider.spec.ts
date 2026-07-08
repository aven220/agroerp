import { SubmissionProvider } from '../providers/submission.provider';

describe('SubmissionProvider', () => {
  const submissions = {
    findAll: jest.fn(),
  };

  let provider: SubmissionProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new SubmissionProvider(submissions as never);
  });

  it('maps related submissions to timeline items', async () => {
    submissions.findAll.mockResolvedValue([
      {
        id: 'sub-1',
        formId: 'form-1',
        status: 'submitted',
        createdAt: new Date('2026-03-01T12:00:00.000Z'),
        data: { producerId: 'p-1' },
        context: {},
        form: { formKey: 'visit_form', name: 'Visita técnica' },
      },
      {
        id: 'sub-2',
        formId: 'form-2',
        status: 'approved',
        createdAt: new Date('2026-02-01T12:00:00.000Z'),
        data: { farmId: 'other' },
        context: {},
        form: { formKey: 'other', name: 'Otro' },
      },
    ]);

    const items = await provider.fetch({
      organizationId: 'org-1',
      entityType: 'Producer',
      entityId: 'p-1',
      aggregateType: 'Producer',
    });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('forms:submission:sub-1');
    expect(items[0].eventType).toBe('FORM_SUBMITTED');
    expect(items[0].source).toBe('FORMS');
  });
});
