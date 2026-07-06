import { BadRequestException, Injectable } from '@nestjs/common';
import { WorkflowDefinitionSchema } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class WorkflowFormBridgeService {
  constructor(private readonly prisma: PrismaService) {}

  async validateStateForms(
    organizationId: string,
    schema: WorkflowDefinitionSchema,
    stateKey: string,
    submissionId?: string,
  ) {
    const state = schema.states.find((s) => s.key === stateKey);
    if (!state?.forms) return { valid: true, errors: [] };

    const errors: string[] = [];
    const required = state.forms.required ?? [];

    if (!submissionId && required.length > 0) {
      errors.push(`Se requieren formularios: ${required.join(', ')}`);
      return { valid: false, errors };
    }

    if (submissionId) {
      const submission = await this.prisma.formSubmission.findFirst({
        where: { id: submissionId, organizationId, deletedAt: null },
      });
      if (!submission) {
        errors.push('Envío de formulario no encontrado');
      } else if (state.forms.requireGps && !submission.gpsLocation) {
        errors.push('GPS requerido en el formulario');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async linkSubmissionToInstance(
    organizationId: string,
    instanceId: string,
    submissionId: string,
    workflowState: string,
  ) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, organizationId },
    });
    if (!instance) throw new BadRequestException('Instancia no encontrada');

    return this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        workflowState,
        context: {
          ...(typeof instance.context === 'object' ? instance.context : {}),
          workflowInstanceId: instanceId,
        },
      },
    });
  }
}
