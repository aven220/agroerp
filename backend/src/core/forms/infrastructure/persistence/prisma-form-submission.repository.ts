import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import type {
  FormSubmissionCreateData,
  FormSubmissionFindManyFilters,
  FormSubmissionRepository,
  SubmissionResourceCreateData,
} from '../../domain/interfaces/form-submission.repository';
import type {
  FormSubmission,
  FormSubmissionStatsRow,
  FormSubmissionWithForm,
  SubmissionResource,
} from '../../domain/types/form.types';

const formSummarySelect = {
  id: true,
  formKey: true,
  name: true,
  version: true,
} as const;

const formDetailSelect = {
  ...formSummarySelect,
  schema: true,
} as const;

@Injectable()
export class PrismaFormSubmissionRepository implements FormSubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filters: FormSubmissionFindManyFilters,
  ): Promise<FormSubmissionWithForm[]> {
    return this.prisma.formSubmission.findMany({
      where: {
        organizationId: filters.organizationId,
        ...(filters.formId ? { formId: filters.formId } : {}),
        ...(filters.formKey
          ? { form: { formKey: filters.formKey } }
          : {}),
      },
      include: {
        form: { select: formSummarySelect },
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<FormSubmissionWithForm[]>;
  }

  async findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormSubmissionWithForm | null> {
    return this.prisma.formSubmission.findFirst({
      where: { id, organizationId },
      include: {
        form: { select: formDetailSelect },
      },
    }) as Promise<FormSubmissionWithForm | null>;
  }

  async findByExternalId(
    organizationId: string,
    externalId: string,
  ): Promise<(FormSubmission & { form: FormSubmissionWithForm['form'] }) | null> {
    return this.prisma.formSubmission.findFirst({
      where: { organizationId, externalId },
      include: { form: true },
    }) as Promise<(FormSubmission & { form: FormSubmissionWithForm['form'] }) | null>;
  }

  async create(data: FormSubmissionCreateData): Promise<FormSubmission> {
    return this.prisma.formSubmission.create({
      data: {
        organizationId: data.organizationId,
        formId: data.formId,
        formVersion: data.formVersion,
        resourceId: data.resourceId,
        data: data.data,
        gpsLocation: data.gpsLocation,
        gpsTrack: data.gpsTrack,
        deviceInfo: data.deviceInfo,
        context: data.context,
        status: data.status,
        syncStatus: data.syncStatus,
        externalId: data.externalId,
        createdBy: data.createdBy,
      },
    }) as Promise<FormSubmission>;
  }

  async createResource(
    data: SubmissionResourceCreateData,
  ): Promise<SubmissionResource> {
    return this.prisma.resource.create({
      data: {
        organizationId: data.organizationId,
        resourceType: data.resourceType,
        schemaVersion: data.schemaVersion,
        data: data.data,
        attributes: data.attributes,
        metadata: data.metadata,
        status: data.status,
        syncStatus: data.syncStatus,
        externalId: data.externalId,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
      },
    }) as Promise<SubmissionResource>;
  }

  async findResourceById(id: string): Promise<SubmissionResource | null> {
    return this.prisma.resource.findUnique({
      where: { id },
    }) as Promise<SubmissionResource | null>;
  }

  async findStatsRowsByFormId(
    organizationId: string,
    formId: string,
  ): Promise<FormSubmissionStatsRow[]> {
    return this.prisma.formSubmission.findMany({
      where: {
        organizationId,
        formId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        syncStatus: true,
        gpsLocation: true,
        createdAt: true,
        context: true,
        data: true,
      },
    }) as Promise<FormSubmissionStatsRow[]>;
  }
}
