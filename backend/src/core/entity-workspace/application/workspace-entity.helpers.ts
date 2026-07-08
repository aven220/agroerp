import type {
  UreDocument,
  UreFormLink,
  UrePhoto,
  UreRelationship,
} from '@agroerp/shared';

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function mapDocuments(raw: unknown): UreDocument[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((doc) => {
    const d = asRecord(doc);
    return {
      id: String(d.id ?? ''),
      title: (d.title as string) ?? null,
      documentTypeCode: (d.documentTypeCode as string) ?? null,
      mediaType: (d.mediaType as string) ?? null,
      contentId: (d.contentId as string) ?? null,
      createdAt: d.createdAt
        ? new Date(d.createdAt as string | Date).toISOString()
        : undefined,
    };
  });
}

export function extractPhotos(documents: UreDocument[]): UrePhoto[] {
  return documents
    .filter((d) => {
      const mt = (d.mediaType ?? '').toLowerCase();
      const dt = (d.documentTypeCode ?? '').toLowerCase();
      return mt.includes('image') || mt.includes('photo') || dt.includes('photo');
    })
    .map((d) => ({
      id: d.id,
      title: d.title,
      contentId: d.contentId,
      capturedAt: d.createdAt,
    }));
}

export function mapRelatedForms(
  submissions: Array<{
    id: string;
    formId: string;
    status?: string;
    createdAt: Date;
    data?: unknown;
    context?: unknown;
    form?: { formKey?: string; name?: string };
  }>,
  recordId: string,
): UreFormLink[] {
  return submissions
    .filter((s) => matchesEntityRecord(s, recordId))
    .slice(0, 20)
    .map((s) => ({
      id: s.id,
      formId: s.formId,
      formKey: s.form?.formKey,
      name: s.form?.name,
      status: s.status,
      submittedAt: s.createdAt?.toISOString?.() ?? String(s.createdAt),
    }));
}

export function matchesEntityRecord(
  submission: { data?: unknown; context?: unknown },
  recordId: string,
): boolean {
  const data = asRecord(submission.data);
  const ctx = asRecord(submission.context);
  return (
    data.producerId === recordId ||
    data.producer_id === recordId ||
    data.farmId === recordId ||
    data.farm_id === recordId ||
    data.lotId === recordId ||
    data.lot_id === recordId ||
    ctx.entityId === recordId ||
    ctx.contextId === recordId
  );
}

export function buildProducerRelationships(profile: unknown): UreRelationship[] {
  const links =
    (profile as { territoryLinks?: Array<{ farmUnit?: { id: string; farmName?: string } }> })
      .territoryLinks ?? [];
  return links.map((link) => ({
    id: link.farmUnit?.id ?? '',
    entityType: 'Farm',
    label: link.farmUnit?.farmName ?? 'Finca',
    href: `/record-explorer/Farm/${link.farmUnit?.id}`,
  }));
}

export function buildFarmRelationships(profile: unknown): UreRelationship[] {
  const producerLinks =
    (profile as { producerLinks?: Array<{ producer?: { id: string; legalName?: string } }> })
      .producerLinks ?? [];
  const lots =
    (profile as { lots?: Array<{ id: string; lotName?: string; lotCode?: string }> }).lots ?? [];

  return [
    ...producerLinks.map((link) => ({
      id: link.producer?.id ?? '',
      entityType: 'Producer',
      label: link.producer?.legalName ?? 'Productor',
      href: `/record-explorer/Producer/${link.producer?.id}`,
    })),
    ...lots.map((lot) => ({
      id: lot.id,
      entityType: 'Lot',
      label: lot.lotName ?? lot.lotCode ?? 'Lote',
      href: `/record-explorer/Lot/${lot.id}`,
    })),
  ];
}

export function buildLotRelationships(profile: unknown): UreRelationship[] {
  const farmUnit = (profile as { farmUnit?: { id: string; farmName?: string } }).farmUnit;
  const producer = (profile as {
    responsibleProducer?: { id: string; legalName?: string };
  }).responsibleProducer;

  return [
    ...(farmUnit
      ? [{
          id: farmUnit.id,
          entityType: 'Farm',
          label: farmUnit.farmName ?? 'Finca',
          href: `/record-explorer/Farm/${farmUnit.id}`,
        }]
      : []),
    ...(producer
      ? [{
          id: producer.id,
          entityType: 'Producer',
          label: producer.legalName ?? 'Productor',
          href: `/record-explorer/Producer/${producer.id}`,
        }]
      : []),
  ];
}

export function levelFromScore(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}
