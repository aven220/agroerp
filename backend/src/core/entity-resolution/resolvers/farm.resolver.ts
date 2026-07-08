import { Injectable, NotFoundException } from '@nestjs/common';
import { FarmsService } from '@/core/ftip/application/farms.service';
import type { EntityResolver } from '../interfaces/entity-resolver.interface';
import type { EntityResolutionRequest, ResolutionResult } from '../domain/entity-resolution.types';
import { resolvedResult, unresolvedResult } from '../domain/entity-resolution.types';
import { RESOLVER_CONFIDENCE } from '../domain/resolver-priority';
import {
  isUuid,
  normalizeText,
  pickString,
  toAlternatives,
} from '../application/resolver-utils';

@Injectable()
export class FarmResolver implements EntityResolver {
  readonly key = 'farm';

  constructor(private readonly farms: FarmsService) {}

  supports(request: EntityResolutionRequest): boolean {
    return request.entityType === 'Farm' || request.entityType === 'FarmUnit';
  }

  async resolve(request: EntityResolutionRequest): Promise<ResolutionResult> {
    const payload = request.payload;
    const orgId = request.organizationId;

    const uuid = pickString(payload, [
      'farmId',
      'farm_id',
      'farmUnitId',
      'farm_unit_id',
      'id',
      'entityId',
    ]);
    if (uuid && isUuid(uuid)) {
      const byId = await this.tryFindById(orgId, uuid);
      if (byId) {
        return resolvedResult({
          entityType: 'Farm',
          entityId: byId,
          confidence: RESOLVER_CONFIDENCE.UUID,
          matchedBy: 'uuid',
          matchedValue: uuid,
        });
      }
    }

    const farmCode = pickString(payload, ['farmCode', 'farm_code', 'codigoFinca']);
    if (farmCode) {
      const byCode = await this.findByExactField(
        orgId,
        (item) => item.farmCode === farmCode,
        farmCode,
        'farmCode',
      );
      if (byCode) return byCode;
    }

    const farmName = pickString(payload, ['farmName', 'farm_name', 'nombreFinca']);
    const producerId = pickString(payload, ['producerId', 'producer_id']);

    if (producerId && farmName) {
      const composite = await this.findByProducerAndName(orgId, producerId, farmName);
      if (composite) return composite;
    }

    if (farmName) {
      const byName = await this.findByExactName(orgId, farmName);
      if (byName) return byName;
    }

    return unresolvedResult('Farm');
  }

  private async tryFindById(orgId: string, id: string): Promise<string | null> {
    try {
      const farm = await this.farms.findOne(orgId, id);
      return farm.id;
    } catch (error) {
      if (error instanceof NotFoundException) return null;
      throw error;
    }
  }

  private async findByExactField(
    orgId: string,
    predicate: (item: { id: string; farmCode?: string | null }) => boolean,
    matchedValue: string,
    matchedBy: string,
  ): Promise<ResolutionResult | null> {
    const list = await this.farms.findAll(orgId, {
      search: matchedValue,
      limit: 25,
      page: 1,
    });
    const matches = list.items.filter(predicate);
    if (matches.length === 1) {
      return resolvedResult({
        entityType: 'Farm',
        entityId: matches[0].id,
        confidence: RESOLVER_CONFIDENCE.CODE,
        matchedBy,
        matchedValue,
      });
    }
    if (matches.length > 1) {
      return unresolvedResult(
        'Farm',
        toAlternatives(
          matches.map((item) => ({
            entityId: item.id,
            entityType: 'Farm',
            confidence: RESOLVER_CONFIDENCE.CODE,
            matchedBy,
            matchedValue,
          })),
        ),
      );
    }
    return null;
  }

  private async findByExactName(
    orgId: string,
    farmName: string,
  ): Promise<ResolutionResult | null> {
    const list = await this.farms.findAll(orgId, { search: farmName, limit: 25, page: 1 });
    const normalized = normalizeText(farmName);
    const matches = list.items.filter(
      (item) => normalizeText(item.farmName ?? '') === normalized,
    );

    if (matches.length === 1) {
      return resolvedResult({
        entityType: 'Farm',
        entityId: matches[0].id,
        confidence: RESOLVER_CONFIDENCE.NAME,
        matchedBy: 'name',
        matchedValue: farmName,
      });
    }
    if (matches.length > 1) {
      return unresolvedResult(
        'Farm',
        toAlternatives(
          matches.map((item) => ({
            entityId: item.id,
            entityType: 'Farm',
            confidence: RESOLVER_CONFIDENCE.NAME,
            matchedBy: 'name',
            matchedValue: farmName,
          })),
        ),
      );
    }
    return null;
  }

  private async findByProducerAndName(
    orgId: string,
    producerId: string,
    farmName: string,
  ): Promise<ResolutionResult | null> {
    const list = await this.farms.findAll(orgId, {
      producerId,
      search: farmName,
      limit: 25,
      page: 1,
    });
    const normalized = normalizeText(farmName);
    const matches = list.items.filter(
      (item) => normalizeText(item.farmName ?? '') === normalized,
    );

    if (matches.length === 1) {
      return resolvedResult({
        entityType: 'Farm',
        entityId: matches[0].id,
        confidence: RESOLVER_CONFIDENCE.COMPOSITE,
        matchedBy: 'producer_name',
        matchedValue: `${producerId}|${farmName}`,
      });
    }
    if (matches.length > 1) {
      return unresolvedResult(
        'Farm',
        toAlternatives(
          matches.map((item) => ({
            entityId: item.id,
            entityType: 'Farm',
            confidence: RESOLVER_CONFIDENCE.COMPOSITE,
            matchedBy: 'producer_name',
            matchedValue: `${producerId}|${farmName}`,
          })),
        ),
      );
    }
    return null;
  }
}
