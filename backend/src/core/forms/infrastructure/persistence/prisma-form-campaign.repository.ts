import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import type {
  FormCampaignCreateData,
  FormCampaignFindManyFilters,
  FormCampaignRepository,
  FormCampaignUpdateData,
} from '../../domain/interfaces/form-campaign.repository';
import type {
  FormCampaign,
  FormCampaignWithForm,
} from '../../domain/types/form.types';

const formCampaignInclude = {
  form: {
    select: {
      id: true,
      formKey: true,
      name: true,
      version: true,
      status: true,
      publishedAt: true,
    },
  },
} as const;

const formCampaignIncludeSummary = {
  form: {
    select: { formKey: true, name: true, version: true, status: true },
  },
} as const;

@Injectable()
export class PrismaFormCampaignRepository implements FormCampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filters: FormCampaignFindManyFilters,
  ): Promise<FormCampaignWithForm[]> {
    return this.prisma.formCampaign.findMany({
      where: {
        organizationId: filters.organizationId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.formId ? { formId: filters.formId } : {}),
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { code: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: formCampaignInclude,
      orderBy: [{ status: 'asc' }, { startsAt: 'desc' }],
    }) as Promise<FormCampaignWithForm[]>;
  }

  async findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormCampaignWithForm | null> {
    return this.prisma.formCampaign.findFirst({
      where: { id, organizationId },
      include: formCampaignInclude,
    }) as Promise<FormCampaignWithForm | null>;
  }

  async findByCode(
    organizationId: string,
    code: string,
  ): Promise<FormCampaign | null> {
    return this.prisma.formCampaign.findFirst({
      where: { organizationId, code },
    }) as Promise<FormCampaign | null>;
  }

  async create(data: FormCampaignCreateData): Promise<FormCampaignWithForm> {
    return this.prisma.formCampaign.create({
      data: {
        organizationId: data.organizationId,
        code: data.code,
        name: data.name,
        description: data.description,
        formId: data.formId,
        status: data.status,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        expectedCount: data.expectedCount,
        metadata: data.metadata,
        createdBy: data.createdBy,
      },
      include: formCampaignIncludeSummary,
    }) as Promise<FormCampaignWithForm>;
  }

  async update(
    id: string,
    data: FormCampaignUpdateData,
  ): Promise<FormCampaignWithForm> {
    return this.prisma.formCampaign.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        expectedCount: data.expectedCount,
        ...(data.metadata ? { metadata: data.metadata } : {}),
      },
      include: formCampaignIncludeSummary,
    }) as Promise<FormCampaignWithForm>;
  }

  async updateStatus(
    id: string,
    status: string,
  ): Promise<FormCampaignWithForm> {
    if (status === 'active') {
      return this.prisma.formCampaign.update({
        where: { id },
        data: { status },
        include: { form: { select: { formKey: true, name: true } } },
      }) as Promise<FormCampaignWithForm>;
    }

    return this.prisma.formCampaign.update({
      where: { id },
      data: { status },
    }) as Promise<FormCampaignWithForm>;
  }
}
