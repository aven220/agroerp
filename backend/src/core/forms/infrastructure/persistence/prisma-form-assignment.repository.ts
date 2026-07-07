import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import type {
  FormAssignmentCreateData,
  FormAssignmentFindManyFilters,
  FormAssignmentRepository,
} from '../../domain/interfaces/form-assignment.repository';
import type {
  FormAssignment,
  FormAssignmentWithForm,
} from '../../domain/types/form.types';

@Injectable()
export class PrismaFormAssignmentRepository implements FormAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filters: FormAssignmentFindManyFilters,
  ): Promise<FormAssignmentWithForm[]> {
    return this.prisma.formAssignment.findMany({
      where: {
        organizationId: filters.organizationId,
        ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.formId ? { formId: filters.formId } : {}),
      },
      include: {
        form: {
          select: {
            id: true,
            formKey: true,
            name: true,
            version: true,
            status: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    }) as Promise<FormAssignmentWithForm[]>;
  }

  async findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormAssignment | null> {
    return this.prisma.formAssignment.findFirst({
      where: { id, organizationId },
    }) as Promise<FormAssignment | null>;
  }

  async create(data: FormAssignmentCreateData): Promise<FormAssignmentWithForm> {
    return this.prisma.formAssignment.create({
      data: {
        organizationId: data.organizationId,
        formId: data.formId,
        assigneeType: data.assigneeType,
        assigneeId: data.assigneeId,
        contextType: data.contextType,
        contextId: data.contextId,
        dueAt: data.dueAt,
        assignedBy: data.assignedBy,
      },
      include: {
        form: { select: { formKey: true, name: true } },
      },
    }) as Promise<FormAssignmentWithForm>;
  }

  async complete(id: string): Promise<FormAssignment> {
    return this.prisma.formAssignment.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    }) as Promise<FormAssignment>;
  }
}
