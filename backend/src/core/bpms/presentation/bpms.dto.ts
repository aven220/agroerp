import { BpmsAutomationType, BpmsElementType, BpmsInstanceStatus, BpmsTaskPriority } from '@agroerp/prisma-bpms-client';

export class BpmsCreateProcessDto {
  processKey!: string;
  name!: string;
  moduleTarget?: string;
  description?: string;
}

export class BpmsDuplicateProcessDto {
  newProcessKey!: string;
  newName!: string;
}

export class BpmsImportProcessDto {
  processKey!: string;
  name!: string;
  moduleTarget?: string;
  elements!: Array<{ elementKey: string; elementType: BpmsElementType; name: string; config?: object; posX?: number; posY?: number }>;
  flows!: Array<{ flowKey: string; fromElementKey: string; toElementKey: string; condition?: string }>;
}

export class BpmsSaveDiagramDto {
  elements!: Array<{ elementKey: string; elementType: BpmsElementType; name: string; config?: object; posX: number; posY: number }>;
  flows!: Array<{ flowKey?: string; fromElementKey: string; toElementKey: string; condition?: string }>;
}

export class BpmsStartInstanceDto {
  processKey!: string;
  context?: Record<string, unknown>;
}

export class BpmsSetVariableDto {
  name!: string;
  value!: unknown;
}

export class BpmsCreateRuleDto {
  name!: string;
  expression!: string;
  variables?: string[];
}

export class BpmsEvaluateRuleDto {
  context!: Record<string, unknown>;
}

export class BpmsCreateAutomationDto {
  name!: string;
  automationType!: BpmsAutomationType;
  triggerConfig!: Record<string, unknown>;
  actionConfig!: Record<string, unknown>;
  processKey?: string;
}

export class BpmsTriggerAutomationDto {
  payload?: Record<string, unknown>;
}

export class BpmsCreateWebhookDto {
  name!: string;
  endpointUrl!: string;
  secret?: string;
}

export class BpmsDelegateTaskDto {
  toUserId!: string;
}

export class BpmsCompleteTaskDto {
  approved?: boolean;
  signatureUrl?: string;
}

export class BpmsCommentDto {
  body!: string;
}

export class BpmsAttachmentDto {
  title!: string;
  storageUrl!: string;
}

export class BpmsOfflineBatchDto {
  deviceId!: string;
  operations!: Array<{ type: string; payload: Record<string, unknown> }>;
}
