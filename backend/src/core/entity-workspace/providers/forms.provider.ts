import { Injectable } from '@nestjs/common';
import { FormSubmissionsService } from '@/core/forms/application/form-submissions.service';
import type { WorkspaceProvider } from '../interfaces/workspace-provider.interface';
import type { WorkspaceQueryContext } from '../domain/workspace';
import { mapRelatedForms } from '../application/workspace-entity.helpers';

@Injectable()
export class FormsProvider implements WorkspaceProvider {
  readonly key = 'forms';

  constructor(private readonly submissions: FormSubmissionsService) {}

  async fetch(context: WorkspaceQueryContext) {
    const all = await this.submissions.findAll(context.organizationId);
    const forms = mapRelatedForms(all, context.entityId);

    return {
      section: { id: 'forms', title: 'Formularios', priority: 30 },
      widgets: [
        {
          id: 'forms:main',
          type: 'forms',
          title: 'Formularios relacionados',
          priority: 1,
          data: { forms, total: forms.length },
        },
      ],
    };
  }
}
