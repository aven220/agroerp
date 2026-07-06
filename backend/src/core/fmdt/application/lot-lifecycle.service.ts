import {
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FieldLotStatus } from '@prisma/client';
import { FIELD_LOT_LIFECYCLE_TRANSITIONS } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { LotsService } from './lots.service';
import { LotTwinService } from './lot-twin.service';
import { FieldLotLifecycleDto } from '../presentation/lots.dto';

@Injectable()
export class LotLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly lots: LotsService,
    private readonly twin: LotTwinService,
  ) {}

  async transition(
    organizationId: string,
    fieldLotId: string,
    userId: string,
    dto: FieldLotLifecycleDto,
    ctx?: RequestContext,
  ) {
    const lot = await this.lots.findOne(organizationId, fieldLotId);
    const fromStatus = lot.status;
    const toStatus = dto.toStatus as FieldLotStatus;

    const allowed = FIELD_LOT_LIFECYCLE_TRANSITIONS[fromStatus as keyof typeof FIELD_LOT_LIFECYCLE_TRANSITIONS];
    if (!allowed?.includes(toStatus)) {
      throw new UnprocessableEntityException(`Transición no permitida: ${fromStatus} → ${toStatus}`);
    }

    const updated = await this.prisma.fieldLotProfile.update({
      where: { id: fieldLotId },
      data: {
        status: toStatus,
        ...(toStatus === 'active' && !lot.activatedAt ? { activatedAt: new Date() } : {}),
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    await this.prisma.fieldLotLifecycleEvent.create({
      data: {
        organizationId,
        fieldLotId,
        fromStatus,
        toStatus,
        reasonCode: dto.reasonCode,
        reasonNotes: dto.reasonNotes,
        actorId: userId,
      },
    });

    await this.twin.refresh(organizationId, fieldLotId, ctx);

    if (toStatus === 'active') {
      await this.core.emitFieldLotActivated(
        organizationId,
        fieldLotId,
        { fromStatus, toStatus },
        { ctx: { ...ctx, userId, organizationId } },
      );
    }

    await this.core.emitFieldLotStatusChanged(
      organizationId,
      fieldLotId,
      { fromStatus, toStatus },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return updated;
  }
}
