import { Injectable, NotFoundException } from '@nestjs/common';
import { LotsService } from '@/core/fmdt/application/lots.service';
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
export class LotResolver implements EntityResolver {
  readonly key = 'lot';

  constructor(private readonly lots: LotsService) {}

  supports(request: EntityResolutionRequest): boolean {
    return request.entityType === 'Lot' || request.entityType === 'FieldLotProfile';
  }

  async resolve(request: EntityResolutionRequest): Promise<ResolutionResult> {
    const payload = request.payload;
    const orgId = request.organizationId;

    const uuid = pickString(payload, [
      'lotId',
      'lot_id',
      'fieldLotId',
      'field_lot_id',
      'id',
      'entityId',
    ]);
    if (uuid && isUuid(uuid)) {
      const byId = await this.tryFindById(orgId, uuid);
      if (byId) {
        return resolvedResult({
          entityType: 'Lot',
          entityId: byId,
          confidence: RESOLVER_CONFIDENCE.UUID,
          matchedBy: 'uuid',
          matchedValue: uuid,
        });
      }
    }

    const lotCode = pickString(payload, ['lotCode', 'lot_code', 'codigoLote']);
    if (lotCode) {
      const byCode = await this.findByExactField(
        orgId,
        (item) => item.lotCode === lotCode,
        lotCode,
        'lotCode',
      );
      if (byCode) return byCode;
    }

    const lotName = pickString(payload, ['lotName', 'lot_name', 'nombreLote']);
    const farmUnitId = pickString(payload, ['farmId', 'farm_id', 'farmUnitId', 'farm_unit_id']);

    if (farmUnitId && lotName) {
      const composite = await this.findByFarmAndName(orgId, farmUnitId, lotName);
      if (composite) return composite;
    }

    if (lotName) {
      const byName = await this.findByExactName(orgId, lotName);
      if (byName) return byName;
    }

    return unresolvedResult('Lot');
  }

  private async tryFindById(orgId: string, id: string): Promise<string | null> {
    try {
      const lot = await this.lots.findOne(orgId, id);
      return lot.id;
    } catch (error) {
      if (error instanceof NotFoundException) return null;
      throw error;
    }
  }

  private async findByExactField(
    orgId: string,
    predicate: (item: { id: string; lotCode?: string | null }) => boolean,
    matchedValue: string,
    matchedBy: string,
  ): Promise<ResolutionResult | null> {
    const list = await this.lots.findAll(orgId, {
      search: matchedValue,
      limit: 25,
      page: 1,
    });
    const matches = list.items.filter(predicate);
    if (matches.length === 1) {
      return resolvedResult({
        entityType: 'Lot',
        entityId: matches[0].id,
        confidence: RESOLVER_CONFIDENCE.CODE,
        matchedBy,
        matchedValue,
      });
    }
    if (matches.length > 1) {
      return unresolvedResult(
        'Lot',
        toAlternatives(
          matches.map((item) => ({
            entityId: item.id,
            entityType: 'Lot',
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
    lotName: string,
  ): Promise<ResolutionResult | null> {
    const list = await this.lots.findAll(orgId, { search: lotName, limit: 25, page: 1 });
    const normalized = normalizeText(lotName);
    const matches = list.items.filter(
      (item) => normalizeText(item.lotName ?? '') === normalized,
    );

    if (matches.length === 1) {
      return resolvedResult({
        entityType: 'Lot',
        entityId: matches[0].id,
        confidence: RESOLVER_CONFIDENCE.NAME,
        matchedBy: 'name',
        matchedValue: lotName,
      });
    }
    if (matches.length > 1) {
      return unresolvedResult(
        'Lot',
        toAlternatives(
          matches.map((item) => ({
            entityId: item.id,
            entityType: 'Lot',
            confidence: RESOLVER_CONFIDENCE.NAME,
            matchedBy: 'name',
            matchedValue: lotName,
          })),
        ),
      );
    }
    return null;
  }

  private async findByFarmAndName(
    orgId: string,
    farmUnitId: string,
    lotName: string,
  ): Promise<ResolutionResult | null> {
    const list = await this.lots.findAll(orgId, {
      farmUnitId,
      search: lotName,
      limit: 25,
      page: 1,
    });
    const normalized = normalizeText(lotName);
    const matches = list.items.filter(
      (item) => normalizeText(item.lotName ?? '') === normalized,
    );

    if (matches.length === 1) {
      return resolvedResult({
        entityType: 'Lot',
        entityId: matches[0].id,
        confidence: RESOLVER_CONFIDENCE.COMPOSITE,
        matchedBy: 'farm_name',
        matchedValue: `${farmUnitId}|${lotName}`,
      });
    }
    if (matches.length > 1) {
      return unresolvedResult(
        'Lot',
        toAlternatives(
          matches.map((item) => ({
            entityId: item.id,
            entityType: 'Lot',
            confidence: RESOLVER_CONFIDENCE.COMPOSITE,
            matchedBy: 'farm_name',
            matchedValue: `${farmUnitId}|${lotName}`,
          })),
        ),
      );
    }
    return null;
  }
}
