import { IamRowPolicyService } from './iam-row-policy.service';

describe('IamRowPolicyService', () => {
  const service = new IamRowPolicyService({} as never);

  it('filters rows by allow policy', () => {
    const rows = [
      { id: '1', organizationId: 'org-a' },
      { id: '2', organizationId: 'org-b' },
    ];
    const policies = [
      {
        effect: 'allow',
        attribute: 'organizationId',
        operator: 'eq',
        value: 'org-a',
        roles: ['field_agent'],
      },
    ];
    const filtered = service.filterRows(rows, policies, ['field_agent'], {});
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('denies rows matching deny policy', () => {
    const rows = [{ id: '1', status: 'blocked' }, { id: '2', status: 'active' }];
    const policies = [
      {
        effect: 'deny',
        attribute: 'status',
        operator: 'eq',
        value: 'blocked',
        roles: [],
      },
    ];
    const filtered = service.filterRows(rows, policies, ['admin'], {});
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });
});
