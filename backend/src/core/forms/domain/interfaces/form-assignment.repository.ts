import type { FormAssignment, FormAssignmentWithForm } from '../types/form.types';

export interface FormAssignmentFindManyFilters {
  organizationId: string;
  assigneeId?: string;
  status?: string;
  formId?: string;
}

export interface FormAssignmentCreateData {
  organizationId: string;
  formId: string;
  assigneeType: string;
  assigneeId: string;
  contextType?: string | null;
  contextId?: string | null;
  dueAt?: Date;
  assignedBy: string;
}

export interface FormAssignmentRepository {
  findMany(
    filters: FormAssignmentFindManyFilters,
  ): Promise<FormAssignmentWithForm[]>;

  findFirstByOrgAndId(
    organizationId: string,
    id: string,
  ): Promise<FormAssignment | null>;

  create(data: FormAssignmentCreateData): Promise<FormAssignmentWithForm>;

  complete(id: string): Promise<FormAssignment>;
}
