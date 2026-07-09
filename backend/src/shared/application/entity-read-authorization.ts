import { BadRequestException, ForbiddenException } from '@nestjs/common';

const ENTITY_READ_PERMISSION: Record<string, string> = {
  producer: 'producer:read',
  farm: 'farm:read',
  lot: 'lot:read',
};

export function assertEntityReadPermission(
  user: { permissions?: string[] },
  entityParam: string,
): void {
  const key = entityParam.trim().toLowerCase();
  const required = ENTITY_READ_PERMISSION[key];
  if (!required) {
    throw new BadRequestException(
      `Unsupported entity type: ${entityParam}. Supported: Producer, Farm, Lot`,
    );
  }
  const perms = user.permissions ?? [];
  if (perms.includes('*:*') || perms.includes(required)) return;
  throw new ForbiddenException(`Missing permissions: ${required}`);
}
