import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import {
  FORM_ASSIGNMENT_REPOSITORY,
  type FormAssignmentRepository,
} from '../domain/interfaces';
import { FormsService } from './forms.service';

@Injectable()
export class FormAssignmentsService {
  constructor(
    @Inject(FORM_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: FormAssignmentRepository,
    private readonly core: CoreEngineService,
    private readonly forms: FormsService,
  ) {}

  async findAll(
    organizationId: string,
    filters?: { assigneeId?: string; status?: string; formId?: string },
  ) {
    return this.assignmentRepository.findMany({
      organizationId,
      assigneeId: filters?.assigneeId,
      status: filters?.status,
      formId: filters?.formId,
    });
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      formId: string;
      assigneeType: string;
      assigneeId: string;
      contextType?: string;
      contextId?: string;
      dueAt?: string;
    },
    ctx?: RequestContext,
  ) {
    await this.forms.findOne(organizationId, data.formId);
    const assignment = await this.assignmentRepository.create({
      organizationId,
      formId: data.formId,
      assigneeType: data.assigneeType,
      assigneeId: data.assigneeId,
      contextType: data.contextType,
      contextId: data.contextId,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      assignedBy: userId,
    });
    await this.core.emitUserAction(
      organizationId,
      'Form',
      data.formId,
      'FORM_ASSIGNED',
      {
        assignmentId: assignment.id,
        assigneeId: data.assigneeId,
        formKey: assignment.form.formKey,
      },
      { ctx: { ...ctx, userId, organizationId } },
    );
    return assignment;
  }

  async complete(organizationId: string, id: string, userId: string) {
    const assignment = await this.assignmentRepository.findFirstByOrgAndId(
      organizationId,
      id,
    );
    if (!assignment) throw new NotFoundException('Assignment not found');
    return this.assignmentRepository.complete(id);
  }
}
