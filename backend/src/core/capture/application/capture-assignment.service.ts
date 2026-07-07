import { Injectable } from '@nestjs/common';
import { FormAssignmentsService } from '@/core/forms/application/form-assignments.service';

@Injectable()
export class CaptureAssignmentService {
  constructor(private readonly formAssignments: FormAssignmentsService) {}

  async getAssignmentsForUser(organizationId: string, userId: string) {
    return this.formAssignments.findAll(organizationId, {
      assigneeId: userId,
      status: 'pending',
    });
  }

  async getAssignmentsForForm(organizationId: string, formId: string) {
    return this.formAssignments.findAll(organizationId, { formId });
  }
}
