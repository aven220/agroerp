import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FormDefinitionSchema } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import {
  FORM_REPOSITORY,
  type FormRepository,
} from '../domain/interfaces';
import { FormRendererService } from './form-renderer.service';
import { CreateFormDto, UpdateFormDto } from '../presentation/forms.dto';

@Injectable()
export class FormsService {
  constructor(
    @Inject(FORM_REPOSITORY)
    private readonly formRepository: FormRepository,
    private readonly core: CoreEngineService,
    private readonly renderer: FormRendererService,
  ) {}

  async findAll(organizationId: string, status?: string, search?: string) {
    return this.formRepository.findMany({
      organizationId,
      status: status as
        | 'draft'
        | 'published'
        | 'deprecated'
        | 'in_review'
        | 'approved'
        | 'rejected'
        | 'archived'
        | undefined,
      search,
    });
  }

  async findPublished(organizationId: string) {
    const forms = await this.formRepository.findMany({
      organizationId,
      publishedOnly: true,
    });

    const latestByKey = new Map<string, (typeof forms)[number]>();
    for (const form of forms) {
      if (!latestByKey.has(form.formKey)) {
        latestByKey.set(form.formKey, form);
      }
    }
    return Array.from(latestByKey.values());
  }

  async findOne(organizationId: string, id: string) {
    const form = await this.formRepository.findFirstByOrgAndId(
      organizationId,
      id,
    );
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async findPublishedByKey(organizationId: string, formKey: string) {
    const form = await this.formRepository.findPublishedByKey(
      organizationId,
      formKey,
    );
    if (!form) throw new NotFoundException('Published form not found');
    return form;
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateFormDto,
    ctx?: RequestContext,
  ) {
    const latest = await this.formRepository.findLatestByKey(
      organizationId,
      dto.formKey,
    );

    const version = (latest?.version ?? 0) + 1;
    const schema = this.normalizeSchema(dto.schema, version);
    const metadata = this.buildFormMetadata(dto);

    const form = await this.formRepository.create({
      organizationId,
      formKey: dto.formKey,
      name: dto.name,
      description: dto.description,
      version,
      schema: schema as object,
      status: 'draft',
      createdBy: userId,
      metadata,
    });

    await this.core.emitFormCreated(
      organizationId,
      form.id,
      {
        formKey: form.formKey,
        name: form.name,
        version: form.version,
        status: form.status,
      },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return form;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateFormDto,
    ctx?: RequestContext,
  ) {
    const existing = await this.findOne(organizationId, id);
    if (existing.status !== 'draft') {
      throw new ConflictException('Only draft forms can be updated');
    }

    const currentSchema = existing.schema as unknown as FormDefinitionSchema;
    const schema = dto.schema
      ? this.normalizeSchema(dto.schema, existing.version)
      : currentSchema;

    const form = await this.formRepository.update(id, {
      name: dto.name ?? existing.name,
      description: dto.description ?? existing.description,
      schema: schema as object,
      ...(dto.metadata !== undefined || dto.requiredCatalogKeys !== undefined
        ? {
            metadata: this.buildFormMetadata(dto, existing.metadata as Record<string, unknown>),
          }
        : {}),
    });

    await this.core.emitUserAction(
      organizationId,
      'Form',
      id,
      'FORM_UPDATED',
      { formKey: form.formKey, version: form.version },
      { ctx: { ...ctx, userId: ctx?.userId, organizationId } },
    );

    return form;
  }

  async publish(
    organizationId: string,
    id: string,
    userId: string,
    ctx?: RequestContext,
  ) {
    const form = await this.findOne(organizationId, id);
    if (form.status !== 'draft' && form.status !== 'approved') {
      throw new ConflictException('Only draft or approved forms can be published');
    }

    const schema = form.schema as unknown as FormDefinitionSchema;
    if (!schema.fields || schema.fields.length === 0) {
      throw new BadRequestException('Form must have at least one field');
    }

    await this.formRepository.publish(organizationId, id, form.formKey);

    const published = await this.findOne(organizationId, id);

    await this.core.emitFormPublished(
      organizationId,
      id,
      {
        formKey: published.formKey,
        name: published.name,
        version: published.version,
      },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return published;
  }

  async createNewVersion(
    organizationId: string,
    formKey: string,
    userId: string,
    ctx?: RequestContext,
  ) {
    const latest = await this.formRepository.findLatestByKey(
      organizationId,
      formKey,
    );
    if (!latest) throw new NotFoundException('Form not found');

    const version = latest.version + 1;
    const schema = latest.schema as unknown as FormDefinitionSchema;
    const newSchema = this.normalizeSchema(
      { ...schema, version },
      version,
    );

    const form = await this.formRepository.create({
      organizationId,
      formKey,
      name: latest.name,
      description: latest.description,
      version,
      schema: newSchema as object,
      status: 'draft',
      createdBy: userId,
      metadata: (latest.metadata ?? {}) as object,
    });

    await this.core.emitFormCreated(
      organizationId,
      form.id,
      {
        formKey: form.formKey,
        name: form.name,
        version: form.version,
        status: form.status,
        clonedFrom: latest.id,
      },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return form;
  }

  async render(
    organizationId: string,
    id: string,
    partialData: Record<string, unknown> = {},
  ) {
    const form = await this.findOne(organizationId, id);
    const schema = form.schema as unknown as FormDefinitionSchema;
    const renderResult = this.renderer.render(schema, partialData);
    const meta = (form.metadata ?? {}) as Record<string, unknown>;

    return {
      formId: form.id,
      formKey: form.formKey,
      name: form.name,
      version: form.version,
      status: form.status,
      metadata: meta,
      requiredCatalogKeys: Array.isArray(meta.requiredCatalogKeys)
        ? (meta.requiredCatalogKeys as string[])
        : [],
      render: renderResult,
      ...renderResult,
    };
  }

  async bootstrap(organizationId: string) {
    const forms = await this.findPublished(organizationId);
    const active = forms.filter((f) => {
      const schema = f.schema as unknown as FormDefinitionSchema;
      return schema.settings?.offlineCapable !== false;
    });

    return {
      syncedAt: new Date().toISOString(),
      forms: active.map((f) => ({
        id: f.id,
        formKey: f.formKey,
        name: f.name,
        description: f.description,
        version: f.version,
        status: f.status,
        schema: f.schema,
        publishedAt: f.publishedAt,
      })),
    };
  }

  private normalizeSchema(
    schema: FormDefinitionSchema,
    version: number,
  ): FormDefinitionSchema {
    if (!schema.fields || !Array.isArray(schema.fields)) {
      throw new BadRequestException('Schema must include a fields array');
    }

    const keys = new Set<string>();
    for (const field of schema.fields) {
      if (!field.key || !field.type || !field.label) {
        throw new BadRequestException(
          'Each field must have key, type, and label',
        );
      }
      if (keys.has(field.key)) {
        throw new BadRequestException(`Duplicate field key: ${field.key}`);
      }
      keys.add(field.key);
    }

    return {
      ...schema,
      version,
      settings: this.normalizeSettings(schema.settings),
    };
  }

  private normalizeSettings(
    settings: FormDefinitionSchema['settings'] = {},
  ): FormDefinitionSchema['settings'] {
    const allowOffline =
      settings.allowOffline ?? settings.offlineCapable ?? true;
    return {
      allowDraft: true,
      ...settings,
      allowOffline,
      offlineCapable: settings.offlineCapable ?? allowOffline,
    };
  }

  private buildFormMetadata(
    dto: Pick<CreateFormDto, 'metadata' | 'requiredCatalogKeys'>,
    existing: Record<string, unknown> = {},
  ): object {
    const meta: Record<string, unknown> = {
      ...existing,
      ...(dto.metadata ?? {}),
    };
    if (dto.requiredCatalogKeys !== undefined) {
      meta.requiredCatalogKeys = dto.requiredCatalogKeys;
    }
    return meta;
  }
}
