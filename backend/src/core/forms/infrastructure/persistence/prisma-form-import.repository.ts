import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import type {
  FormImportLogCreateData,
  FormImportRepository,
} from '../../domain/interfaces/form-import.repository';

@Injectable()
export class PrismaFormImportRepository implements FormImportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateSectorCode(formId: string, sectorCode: string): Promise<void> {
    await this.prisma.formDefinition.update({
      where: { id: formId },
      data: { sectorCode },
    });
  }

  async createImportLog(data: FormImportLogCreateData): Promise<void> {
    await this.prisma.formImportLog.create({
      data: {
        organizationId: data.organizationId,
        formId: data.formId,
        batchId: data.batchId,
        rowNumber: data.rowNumber,
        status: data.status,
        message: data.message,
        payload: data.payload,
      },
    });
  }

  async rollbackImportedForms(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.prisma.formDefinition.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'archived' },
      });
    }
  }
}
