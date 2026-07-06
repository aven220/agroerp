import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FormDefinitionSchema } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { FormsService } from './forms.service';

@Injectable()
export class FormLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly forms: FormsService,
  ) {}

  async duplicate(
    organizationId: string,
    id: string,
    userId: string,
    newFormKey: string,
    ctx?: RequestContext,
  ) {
    const source = await this.forms.findOne(organizationId, id);
    const existing = await this.prisma.formDefinition.findFirst({
      where: { organizationId, formKey: newFormKey },
    });
    if (existing) {
      throw new ConflictException(`Form key "${newFormKey}" already exists`);
    }

    const schema = source.schema as unknown as FormDefinitionSchema;
    const form = await this.prisma.formDefinition.create({
      data: {
        organizationId,
        formKey: newFormKey,
        name: `${source.name} (copia)`,
        description: source.description,
        version: 1,
        schema: { ...schema, version: 1 } as object,
        status: 'draft',
        sectorCode: source.sectorCode,
        commodityCode: source.commodityCode,
        tags: source.tags,
        metadata: source.metadata as object,
        workflowKey: source.workflowKey,
        clonedFromId: source.id,
        createdBy: userId,
      },
    });

    await this.recordHistory(organizationId, form.id, 0, 1, 'duplicate', userId, schema);
    await this.core.emitFormCreated(
      organizationId,
      form.id,
      { formKey: form.formKey, name: form.name, version: 1, clonedFrom: source.id },
      { ctx: { ...ctx, userId, organizationId } },
    );
    return form;
  }

  async cloneVersion(
    organizationId: string,
    formKey: string,
    userId: string,
    ctx?: RequestContext,
  ) {
    return this.forms.createNewVersion(organizationId, formKey, userId, ctx);
  }

  async submitForReview(
    organizationId: string,
    id: string,
    userId: string,
    reasonNotes?: string,
    ctx?: RequestContext,
  ) {
    const form = await this.forms.findOne(organizationId, id);
    if (form.status !== 'draft' && form.status !== 'rejected') {
      throw new ConflictException('Only draft or rejected forms can be submitted for review');
    }
    const updated = await this.prisma.formDefinition.update({
      where: { id },
      data: { status: 'in_review' },
    });
    await this.recordHistory(
      organizationId,
      id,
      form.version,
      form.version,
      'submit_review',
      userId,
      form.schema as object,
      reasonNotes,
    );
    await this.core.emitUserAction(
      organizationId,
      'Form',
      id,
      'FORM_SUBMITTED_FOR_REVIEW',
      { formKey: form.formKey, reasonNotes },
      { ctx: { ...ctx, userId, organizationId } },
    );
    return updated;
  }

  async approve(
    organizationId: string,
    id: string,
    userId: string,
    ctx?: RequestContext,
  ) {
    const form = await this.forms.findOne(organizationId, id);
    if (form.status !== 'in_review') {
      throw new UnprocessableEntityException('Form must be in review to approve');
    }
    const updated = await this.prisma.formDefinition.update({
      where: { id },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
    });
    await this.core.emitUserAction(
      organizationId,
      'Form',
      id,
      'FORM_APPROVED',
      { formKey: form.formKey, version: form.version },
      { ctx: { ...ctx, userId, organizationId } },
    );
    return updated;
  }

  async reject(
    organizationId: string,
    id: string,
    userId: string,
    reasonNotes?: string,
    ctx?: RequestContext,
  ) {
    const form = await this.forms.findOne(organizationId, id);
    if (form.status !== 'in_review') {
      throw new UnprocessableEntityException('Form must be in review to reject');
    }
    const updated = await this.prisma.formDefinition.update({
      where: { id },
      data: { status: 'rejected' },
    });
    await this.recordHistory(
      organizationId,
      id,
      form.version,
      form.version,
      'reject',
      userId,
      form.schema as object,
      reasonNotes,
    );
    await this.core.emitUserAction(
      organizationId,
      'Form',
      id,
      'FORM_REJECTED',
      { formKey: form.formKey, reasonNotes },
      { ctx: { ...ctx, userId, organizationId } },
    );
    return updated;
  }

  async unpublish(organizationId: string, id: string, userId: string, ctx?: RequestContext) {
    const form = await this.forms.findOne(organizationId, id);
    if (form.status !== 'published') {
      throw new ConflictException('Only published forms can be unpublished');
    }
    const updated = await this.prisma.formDefinition.update({
      where: { id },
      data: { status: 'draft', publishedAt: null },
    });
    await this.core.emitUserAction(
      organizationId,
      'Form',
      id,
      'FORM_UNPUBLISHED',
      { formKey: form.formKey },
      { ctx: { ...ctx, userId, organizationId } },
    );
    return updated;
  }

  async archive(organizationId: string, id: string, userId: string, ctx?: RequestContext) {
    const form = await this.forms.findOne(organizationId, id);
    if (form.status === 'archived') {
      throw new ConflictException('Form is already archived');
    }
    const updated = await this.prisma.formDefinition.update({
      where: { id },
      data: { status: 'archived', archivedAt: new Date() },
    });
    await this.core.emitUserAction(
      organizationId,
      'Form',
      id,
      'FORM_ARCHIVED',
      { formKey: form.formKey },
      { ctx: { ...ctx, userId, organizationId } },
    );
    return updated;
  }

  async restore(organizationId: string, id: string, userId: string, ctx?: RequestContext) {
    const form = await this.prisma.formDefinition.findFirst({
      where: { id, organizationId },
    });
    if (!form) throw new NotFoundException('Form not found');
    if (form.status !== 'archived') {
      throw new ConflictException('Only archived forms can be restored');
    }
    const updated = await this.prisma.formDefinition.update({
      where: { id },
      data: { status: 'draft', archivedAt: null },
    });
    await this.core.emitUserAction(
      organizationId,
      'Form',
      id,
      'FORM_RESTORED',
      { formKey: form.formKey },
      { ctx: { ...ctx, userId, organizationId } },
    );
    return updated;
  }

  async softDelete(organizationId: string, id: string, userId: string, ctx?: RequestContext) {
    const form = await this.forms.findOne(organizationId, id);
    if (form.deletedAt) {
      throw new ConflictException('El formulario ya fue eliminado');
    }
    const updated = await this.prisma.formDefinition.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'archived',
        archivedAt: new Date(),
        publishedAt: form.status === 'published' ? null : form.publishedAt,
      },
    });
    await this.core.emitUserAction(
      organizationId,
      'Form',
      id,
      'FORM_DELETED',
      { formKey: form.formKey },
      { ctx: { ...ctx, userId, organizationId } },
    );
    return updated;
  }

  async getVersionHistory(organizationId: string, formId: string) {
    await this.forms.findOne(organizationId, formId);
    return this.prisma.formVersionHistory.findMany({
      where: { organizationId, formId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  private async recordHistory(
    organizationId: string,
    formId: string,
    fromVersion: number,
    toVersion: number,
    changeType: string,
    actorId: string,
    snapshot: object,
    reasonNotes?: string,
  ) {
    await this.prisma.formVersionHistory.create({
      data: {
        organizationId,
        formId,
        fromVersion,
        toVersion,
        changeType,
        snapshot,
        actorId,
        reasonNotes,
      },
    });
  }
}
