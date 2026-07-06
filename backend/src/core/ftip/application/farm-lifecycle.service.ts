import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FarmUnitStatus, Prisma } from '@prisma/client';
import { FARM_LIFECYCLE_TRANSITIONS } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { FarmsService } from './farms.service';
import { FarmTwinService } from './farm-twin.service';
import { FarmLifecycleDto } from '../presentation/farms.dto';

@Injectable()
export class FarmLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly farms: FarmsService,
    private readonly twin: FarmTwinService,
  ) {}

  async transition(
    organizationId: string,
    farmUnitId: string,
    userId: string,
    dto: FarmLifecycleDto,
    ctx?: RequestContext,
  ) {
    const farm = await this.farms.findOne(organizationId, farmUnitId);
    const fromStatus = farm.status;
    const toStatus = dto.toStatus as FarmUnitStatus;

    const allowed = FARM_LIFECYCLE_TRANSITIONS[fromStatus as keyof typeof FARM_LIFECYCLE_TRANSITIONS];
    if (!allowed?.includes(toStatus)) {
      throw new UnprocessableEntityException(`Transición no permitida: ${fromStatus} → ${toStatus}`);
    }

    if (toStatus === 'active' && !farm.boundaryGeo) {
      throw new UnprocessableEntityException('Polígono requerido para activar finca');
    }

    const updated = await this.prisma.farmUnit.update({
      where: { id: farmUnitId },
      data: {
        status: toStatus,
        ...(toStatus === 'active' && !farm.activatedAt ? { activatedAt: new Date() } : {}),
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    await this.prisma.farmLifecycleEvent.create({
      data: {
        organizationId,
        farmUnitId,
        fromStatus,
        toStatus,
        reasonCode: dto.reasonCode,
        reasonNotes: dto.reasonNotes,
        actorId: userId,
      },
    });

    await this.twin.refresh(organizationId, farmUnitId, ctx);
    await this.core.emitFarmLifecycleChanged(
      organizationId,
      farmUnitId,
      { fromStatus, toStatus },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return updated;
  }
}
