import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { FormsService } from './forms.service';

@Injectable()
export class FormAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly forms: FormsService,
  ) {}

  async findAll(
    organizationId: string,
    filters?: { assigneeId?: string; status?: string; formId?: string },
  ) {
    return this.prisma.formAssignment.findMany({
      where: {
        organizationId,
        ...(filters?.assigneeId ? { assigneeId: filters.assigneeId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.formId ? { formId: filters.formId } : {}),
      },
      include: {
        form: { select: { id: true, formKey: true, name: true, version: true, status: true } },
      },
      orderBy: { assignedAt: 'desc' },
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
    const assignment = await this.prisma.formAssignment.create({
      data: {
        organizationId,
        formId: data.formId,
        assigneeType: data.assigneeType,
        assigneeId: data.assigneeId,
        contextType: data.contextType,
        contextId: data.contextId,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        assignedBy: userId,
      },
      include: {
        form: { select: { formKey: true, name: true } },
      },
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
    const assignment = await this.prisma.formAssignment.findFirst({
      where: { id, organizationId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return this.prisma.formAssignment.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    });
  }
}
