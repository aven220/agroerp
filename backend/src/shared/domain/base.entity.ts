export abstract class BaseEntity {
  id!: string;
  organizationId!: string;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
}

export interface AuditableEntity extends BaseEntity {
  createdBy?: string | null;
  updatedBy?: string | null;
}
