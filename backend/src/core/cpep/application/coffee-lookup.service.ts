import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class CoffeeLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findProducer(organizationId: string, query: string) {
    const producers = await this.prisma.producer.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { legalName: { contains: query, mode: 'insensitive' } },
          { producerNumber: { contains: query, mode: 'insensitive' } },
          { documentNumber: { contains: query, mode: 'insensitive' } },
          { taxId: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { legalName: 'asc' },
    });
    return producers.map((p) => ({
      id: p.id,
      producerCode: p.producerNumber,
      producerName: p.legalName,
      identityDoc: p.documentNumber ?? p.taxId,
      status: p.lifecycleStatus,
    }));
  }

  async getProducer(organizationId: string, producerId: string) {
    const producer = await this.prisma.producer.findFirst({
      where: { id: producerId, organizationId, deletedAt: null },
    });
    if (!producer) throw new NotFoundException('Productor no encontrado');
    const farms = await this.listFarms(organizationId, producerId);
    const history = await this.prisma.cpepReceptionTicket.findMany({
      where: { organizationId, producerId },
      include: { quality: true, settlement: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return {
      id: producer.id,
      producerCode: producer.producerNumber,
      producerName: producer.legalName,
      identityDoc: producer.documentNumber ?? producer.taxId,
      status: producer.lifecycleStatus,
      farms,
      purchaseHistory: history,
    };
  }

  async listFarms(organizationId: string, producerId?: string) {
    const links = producerId
      ? await this.prisma.producerTerritoryLink.findMany({
          where: { organizationId, producerId },
          select: { farmUnitId: true },
        })
      : [];
    const farmIds = links.map((l) => l.farmUnitId);
    return this.prisma.farmUnit.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(farmIds.length ? { id: { in: farmIds } } : {}),
      },
      take: 50,
      orderBy: { farmName: 'asc' },
      select: {
        id: true,
        farmCode: true,
        farmName: true,
        municipalityCode: true,
        departmentCode: true,
        centroidLatitude: true,
        centroidLongitude: true,
      },
    });
  }

  async listLots(organizationId: string, farmId?: string) {
    return this.prisma.fieldLotProfile.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(farmId ? { farmUnitId: farmId } : {}),
      },
      take: 50,
      orderBy: { lotCode: 'asc' },
      select: {
        id: true,
        lotCode: true,
        lotName: true,
        farmUnitId: true,
        status: true,
        plantedAreaHa: true,
      },
    });
  }

  async getFarm(organizationId: string, farmId: string) {
    const farm = await this.prisma.farmUnit.findFirst({
      where: { id: farmId, organizationId, deletedAt: null },
    });
    if (!farm) throw new NotFoundException('Finca no encontrada');
    const lots = await this.listLots(organizationId, farmId);
    return { ...farm, lots };
  }
}
