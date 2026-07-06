import { Injectable } from '@nestjs/common';
import { EaceListingType } from '@agroerp/prisma-eace-client';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { generateEaceKey } from '../domain/eace.engine';
import { EaceAuditService } from './eace-audit.service';

@Injectable()
export class EaceMarketplaceService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly audit: EaceAuditService,
  ) {}

  list(organizationId: string, listingType?: string) {
    return this.prisma.eaceMarketplaceListing.findMany({
      where: { organizationId, status: 'active', ...(listingType ? { listingType: listingType as EaceListingType } : {}) },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async publish(organizationId: string, userId: string, data: {
    listingType: EaceListingType; title: string; description?: string;
    sellerRef?: string; priceRef?: Record<string, unknown>; metadata?: Record<string, unknown>;
  }) {
    const count = await this.prisma.eaceMarketplaceListing.count({ where: { organizationId } });
    const listing = await this.prisma.eaceMarketplaceListing.create({
      data: {
        organizationId,
        listingKey: generateEaceKey('MKT', count + 1),
        listingType: data.listingType,
        title: data.title,
        description: data.description,
        sellerRef: data.sellerRef,
        priceRef: (data.priceRef ?? {}) as object,
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'MarketplaceListing', listing.listingKey, 'marketplace_listing_created', userId);
    return listing;
  }

  architecture() {
    return {
      supportedListingTypes: ['input_purchase', 'product_sale', 'ag_service', 'tech_service', 'machinery_rental', 'labor_hire'],
      paymentGateway: 'not_configured',
      checkoutFlow: 'quote_request',
      integrationReady: true,
    };
  }
}
