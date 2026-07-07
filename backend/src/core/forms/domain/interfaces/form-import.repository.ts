export interface FormImportLogCreateData {
  organizationId: string;
  formId?: string;
  batchId: string;
  rowNumber: number;
  status: string;
  message?: string;
  payload: object;
}

export interface FormImportRepository {
  updateSectorCode(formId: string, sectorCode: string): Promise<void>;

  createImportLog(data: FormImportLogCreateData): Promise<void>;

  rollbackImportedForms(ids: string[]): Promise<void>;
}
