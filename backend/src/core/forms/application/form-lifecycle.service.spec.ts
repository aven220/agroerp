import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { FormLifecycleService } from './form-lifecycle.service';
import { FormsService } from './forms.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { FORM_LIFECYCLE_REPOSITORY } from '../domain/interfaces';

describe('FormLifecycleService', () => {
  let service: FormLifecycleService;
  let lifecycleRepository: {
    findAnyByFormKey: jest.Mock;
    findFirstByOrgAndId: jest.Mock;
    createDuplicate: jest.Mock;
    updateLifecycle: jest.Mock;
    createVersionHistory: jest.Mock;
    findVersionHistory: jest.Mock;
  };
  let forms: { findOne: jest.Mock; createNewVersion: jest.Mock };
  let core: { emitFormCreated: jest.Mock; emitUserAction: jest.Mock };

  beforeEach(async () => {
    lifecycleRepository = {
      findAnyByFormKey: jest.fn(),
      findFirstByOrgAndId: jest.fn(),
      createDuplicate: jest.fn().mockResolvedValue({ id: 'f2', formKey: 'copy', version: 1 }),
      updateLifecycle: jest.fn().mockResolvedValue({ id: 'f1', status: 'archived' }),
      createVersionHistory: jest.fn().mockResolvedValue({}),
      findVersionHistory: jest.fn().mockResolvedValue([]),
    };
    forms = {
      findOne: jest.fn().mockResolvedValue({
        id: 'f1',
        formKey: 'original',
        name: 'Original',
        version: 2,
        schema: { version: 2, fields: [{ key: 'a', type: 'text', label: 'A' }] },
      }),
      createNewVersion: jest.fn(),
    };
    core = {
      emitFormCreated: jest.fn().mockResolvedValue({}),
      emitUserAction: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormLifecycleService,
        { provide: FORM_LIFECYCLE_REPOSITORY, useValue: lifecycleRepository },
        { provide: FormsService, useValue: forms },
        { provide: CoreEngineService, useValue: core },
      ],
    }).compile();

    service = module.get(FormLifecycleService);
  });

  it('duplicates form with new key', async () => {
    lifecycleRepository.findAnyByFormKey.mockResolvedValue(null);
    const result = await service.duplicate('org-1', 'f1', 'user-1', 'copy-key');
    expect(result.formKey).toBe('copy');
    expect(core.emitFormCreated).toHaveBeenCalled();
  });

  it('rejects duplicate when key exists', async () => {
    lifecycleRepository.findAnyByFormKey.mockResolvedValue({ id: 'x' });
    await expect(service.duplicate('org-1', 'f1', 'user-1', 'taken')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('archives form', async () => {
    const result = await service.archive('org-1', 'f1', 'user-1');
    expect(result.status).toBe('archived');
  });
});
