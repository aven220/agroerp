import { Injectable, NotFoundException } from '@nestjs/common';
import { ProducersService } from '@/core/prm/application/producers.service';
import type { EntityResolver } from '../interfaces/entity-resolver.interface';
import type {
  EntityResolutionRequest,
  ResolutionAlternative,
  ResolutionResult,
} from '../domain/entity-resolution.types';
import { resolvedResult, unresolvedResult } from '../domain/entity-resolution.types';
import { RESOLVER_CONFIDENCE } from '../domain/resolver-priority';
import {
  isUuid,
  normalizeText,
  pickString,
  toAlternatives,
} from '../application/resolver-utils';

@Injectable()
export class ProducerResolver implements EntityResolver {
  readonly key = 'producer';

  constructor(private readonly producers: ProducersService) {}

  supports(request: EntityResolutionRequest): boolean {
    return request.entityType === 'Producer';
  }

  async resolve(request: EntityResolutionRequest): Promise<ResolutionResult> {
    const payload = request.payload;
    const orgId = request.organizationId;

    const documentNumber = pickString(payload, [
      'documentNumber',
      'document_number',
      'documento',
    ]);
    if (documentNumber) {
      const duplicate = await this.producers.checkDuplicate(orgId, documentNumber);
      if (duplicate.existing?.id) {
        return resolvedResult({
          entityType: 'Producer',
          entityId: duplicate.existing.id,
          confidence: RESOLVER_CONFIDENCE.DOCUMENT,
          matchedBy: 'document',
          matchedValue: documentNumber,
        });
      }
    }

    const producerNumber = pickString(payload, [
      'producerNumber',
      'producer_number',
      'producerCode',
      'producer_code',
    ]);
    if (producerNumber) {
      const match = await this.findByExactField(
        orgId,
        (item) => item.producerNumber === producerNumber,
        producerNumber,
        'producerNumber',
      );
      if (match) return match;
    }

    const uuid = pickString(payload, ['producerId', 'producer_id', 'id', 'entityId']);
    if (uuid && isUuid(uuid)) {
      const byId = await this.tryFindById(orgId, uuid);
      if (byId) {
        return resolvedResult({
          entityType: 'Producer',
          entityId: byId,
          confidence: RESOLVER_CONFIDENCE.UUID,
          matchedBy: 'uuid',
          matchedValue: uuid,
        });
      }
    }

    const email = pickString(payload, ['email', 'contactEmail', 'contact_email']);
    if (email) {
      const byEmail = await this.findByContact(orgId, 'email', email);
      if (byEmail) return byEmail;
    }

    const phone = pickString(payload, ['phone', 'mobilePhone', 'mobile', 'telefono']);
    if (phone) {
      const byPhone = await this.findByContact(orgId, 'phone', phone);
      if (byPhone) return byPhone;
    }

    const legalName = pickString(payload, ['legalName', 'name', 'fullName', 'nombre']);
    const municipalityCode = pickString(payload, [
      'municipalityCode',
      'municipality_code',
      'municipio',
    ]);
    if (legalName && municipalityCode) {
      const composite = await this.findByNameAndMunicipality(
        orgId,
        legalName,
        municipalityCode,
      );
      if (composite) return composite;
    }

    if (legalName) {
      const byName = await this.findByExactName(orgId, legalName);
      if (byName) return byName;
    }

    return unresolvedResult('Producer');
  }

  private async tryFindById(orgId: string, id: string): Promise<string | null> {
    try {
      const producer = await this.producers.findOne(orgId, id);
      return producer.id;
    } catch (error) {
      if (error instanceof NotFoundException) return null;
      throw error;
    }
  }

  private async findByExactField(
    orgId: string,
    predicate: (item: { id: string; producerNumber?: string | null }) => boolean,
    matchedValue: string,
    matchedBy: string,
  ): Promise<ResolutionResult | null> {
    const list = await this.producers.findAll(orgId, {
      search: matchedValue,
      limit: 25,
      page: 1,
    });
    const matches = list.items.filter(predicate);
    if (matches.length === 1) {
      return resolvedResult({
        entityType: 'Producer',
        entityId: matches[0].id,
        confidence: RESOLVER_CONFIDENCE.CODE,
        matchedBy,
        matchedValue,
      });
    }
    if (matches.length > 1) {
      return unresolvedResult(
        'Producer',
        toAlternatives(
          matches.map((item) => ({
            entityId: item.id,
            entityType: 'Producer',
            confidence: RESOLVER_CONFIDENCE.CODE,
            matchedBy,
            matchedValue,
          })),
        ),
      );
    }
    return null;
  }

  private async findByContact(
    orgId: string,
    field: 'email' | 'phone',
    value: string,
  ): Promise<ResolutionResult | null> {
    const list = await this.producers.findAll(orgId, { search: value, limit: 10, page: 1 });
    const matches: ResolutionAlternative[] = [];

    for (const item of list.items) {
      const full = await this.producers.findOne(orgId, item.id);
      const contacts = full.contacts ?? [];
      const hit = contacts.some((contact) => {
        const candidate = field === 'email' ? contact.email : contact.phone;
        return typeof candidate === 'string' && normalizeText(candidate) === normalizeText(value);
      });
      if (hit) {
        matches.push({
          entityId: item.id,
          entityType: 'Producer',
          confidence:
            field === 'email' ? RESOLVER_CONFIDENCE.EMAIL : RESOLVER_CONFIDENCE.PHONE,
          matchedBy: field,
          matchedValue: value,
        });
      }
    }

    if (matches.length === 1) {
      const match = matches[0];
      return resolvedResult({
        entityType: 'Producer',
        entityId: match.entityId,
        confidence: match.confidence,
        matchedBy: match.matchedBy,
        matchedValue: match.matchedValue,
      });
    }
    if (matches.length > 1) {
      return unresolvedResult('Producer', matches);
    }
    return null;
  }

  private async findByNameAndMunicipality(
    orgId: string,
    legalName: string,
    municipalityCode: string,
  ): Promise<ResolutionResult | null> {
    const list = await this.producers.findAll(orgId, {
      search: legalName,
      municipalityCode,
      limit: 25,
      page: 1,
    });
    const normalizedName = normalizeText(legalName);
    const matches = list.items.filter(
      (item) => normalizeText(item.legalName ?? '') === normalizedName,
    );

    if (matches.length === 1) {
      return resolvedResult({
        entityType: 'Producer',
        entityId: matches[0].id,
        confidence: RESOLVER_CONFIDENCE.NAME_MUNICIPALITY,
        matchedBy: 'name_municipality',
        matchedValue: `${legalName}|${municipalityCode}`,
      });
    }
    if (matches.length > 1) {
      return unresolvedResult(
        'Producer',
        toAlternatives(
          matches.map((item) => ({
            entityId: item.id,
            entityType: 'Producer',
            confidence: RESOLVER_CONFIDENCE.NAME_MUNICIPALITY,
            matchedBy: 'name_municipality',
            matchedValue: `${legalName}|${municipalityCode}`,
          })),
        ),
      );
    }
    return null;
  }

  private async findByExactName(
    orgId: string,
    legalName: string,
  ): Promise<ResolutionResult | null> {
    const list = await this.producers.findAll(orgId, {
      search: legalName,
      limit: 25,
      page: 1,
    });
    const normalizedName = normalizeText(legalName);
    const matches = list.items.filter(
      (item) => normalizeText(item.legalName ?? '') === normalizedName,
    );

    if (matches.length === 1) {
      return resolvedResult({
        entityType: 'Producer',
        entityId: matches[0].id,
        confidence: RESOLVER_CONFIDENCE.NAME,
        matchedBy: 'name',
        matchedValue: legalName,
      });
    }
    if (matches.length > 1) {
      return unresolvedResult(
        'Producer',
        toAlternatives(
          matches.map((item) => ({
            entityId: item.id,
            entityType: 'Producer',
            confidence: RESOLVER_CONFIDENCE.NAME,
            matchedBy: 'name',
            matchedValue: legalName,
          })),
        ),
      );
    }
    return null;
  }
}
