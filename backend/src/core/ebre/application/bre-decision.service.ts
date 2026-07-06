import { Injectable } from '@nestjs/common';
import { BreHitPolicy } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class BreDecisionService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.breDecisionTable.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findByKey(organizationId: string, tableKey: string) {
    return this.prisma.breDecisionTable.findFirst({
      where: { organizationId, tableKey, isActive: true },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      tableKey: string;
      name: string;
      description?: string;
      inputs: unknown[];
      outputs: unknown[];
      rows: unknown[];
      hitPolicy?: BreHitPolicy;
    },
  ) {
    return this.prisma.breDecisionTable.create({
      data: {
        organizationId,
        tableKey: data.tableKey,
        name: data.name,
        description: data.description,
        inputs: data.inputs as object,
        outputs: data.outputs as object,
        rows: data.rows as object,
        hitPolicy: data.hitPolicy ?? 'first',
        createdBy: userId,
      },
    });
  }

  evaluate(
    table: { rows: unknown; hitPolicy: string },
    inputs: Record<string, unknown>,
  ): Record<string, unknown>[] {
    const rows = (table.rows as Array<{ inputs: Record<string, unknown>; outputs: Record<string, unknown>; priority?: number }>) ?? [];
    const matches = rows.filter((row) =>
      Object.entries(row.inputs ?? {}).every(([k, v]) => this.matchInput(inputs[k], v)),
    );

    if (!matches.length) return [];

    const sorted = [...matches].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    switch (table.hitPolicy) {
      case 'collect':
        return sorted.map((r) => r.outputs);
      case 'unique':
        return sorted.length === 1 ? [sorted[0].outputs] : [];
      case 'priority':
      case 'first':
      default:
        return [sorted[0].outputs];
    }
  }

  private matchInput(actual: unknown, expected: unknown): boolean {
    if (expected === '*') return true;
    if (Array.isArray(expected)) return expected.includes(actual);
    if (typeof expected === 'string' && expected.startsWith('>')) {
      return Number(actual) > Number(expected.slice(1));
    }
    if (typeof expected === 'string' && expected.startsWith('<')) {
      return Number(actual) < Number(expected.slice(1));
    }
    return actual === expected;
  }
}
