import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { HcmEmployeeService } from './hcm-employee.service';
import { HcmContractService } from './hcm-contract.service';
import { HcmDocumentService } from './hcm-document.service';
import { HcmRcVacancyService } from './hcm-rc-vacancy.service';
import { HcmRcRecruitmentService } from './hcm-rc-recruitment.service';
import { HcmRcOnboardingService } from './hcm-rc-onboarding.service';
import { generateEmployeeNumberFromCandidate, generateRcKey } from '../domain/hcm-recruitment.engine';
import type { HcmContractType, HcmRcOfferStatus } from '@prisma/client';

function mapContractType(raw: string): HcmContractType {
  const map: Record<string, HcmContractType> = {
    indefinite: 'indefinite',
    fixed_term: 'fixed_term',
    fixed: 'fixed_term',
    work_order: 'work_order',
    apprenticeship: 'apprenticeship',
    contractor: 'contractor',
    intern: 'intern',
  };
  return map[raw.toLowerCase()] ?? 'indefinite';
}

@Injectable()
export class HcmRcHiringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
    private readonly employees: HcmEmployeeService,
    private readonly contracts: HcmContractService,
    private readonly documents: HcmDocumentService,
    private readonly vacancies: HcmRcVacancyService,
    private readonly recruitment: HcmRcRecruitmentService,
    private readonly onboarding: HcmRcOnboardingService,
  ) {}

  listOffers(organizationId: string, filters?: { vacancyKey?: string; status?: HcmRcOfferStatus }) {
    return this.prisma.hcmRcOffer.findMany({
      where: {
        organizationId,
        ...(filters?.vacancyKey ? { vacancyKey: filters.vacancyKey } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: { candidate: true, vacancy: true, signatures: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOffer(organizationId: string, offerKey: string) {
    const offer = await this.prisma.hcmRcOffer.findFirst({
      where: { organizationId, offerKey },
      include: { candidate: true, vacancy: true, signatures: true, onboarding: { include: { tasks: true } } },
    });
    if (!offer) throw new NotFoundException(`Oferta ${offerKey} no encontrada`);
    return offer;
  }

  async createOffer(organizationId: string, userId: string, input: {
    vacancyKey: string; candidateKey: string; salary: number; contractType: string;
    startDate: string; expiresAt?: string; positionKey?: string; departmentKey?: string;
    branchKey?: string; managerKey?: string; iamRoleKeys?: string[];
  }) {
    await this.vacancies.get(organizationId, input.vacancyKey);
    await this.recruitment.getCandidate(organizationId, input.candidateKey);

    const offerKey = generateRcKey('OFR', (await this.prisma.hcmRcOffer.count({ where: { organizationId } })) + 1);
    const offer = await this.prisma.hcmRcOffer.create({
      data: {
        organizationId,
        offerKey,
        vacancyKey: input.vacancyKey,
        candidateKey: input.candidateKey,
        status: 'draft',
        salary: input.salary,
        contractType: input.contractType,
        startDate: new Date(input.startDate),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        positionKey: input.positionKey,
        departmentKey: input.departmentKey,
        branchKey: input.branchKey,
        managerKey: input.managerKey,
        iamRoleKeys: input.iamRoleKeys ?? [],
        createdBy: userId,
      },
    });

    await this.prisma.hcmRcApplication.updateMany({
      where: { organizationId, vacancyKey: input.vacancyKey, candidateKey: input.candidateKey },
      data: { status: 'offer' },
    });

    await this.audit.log(organizationId, 'HcmRcOffer', offerKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmRcOffer', offerKey, EVENT_TYPES.HCM_RC_OFFER_CREATED, input);
    return offer;
  }

  async sendOffer(organizationId: string, offerKey: string, userId: string) {
    const offer = await this.getOffer(organizationId, offerKey);
    if (offer.status !== 'draft') throw new BadRequestException('Solo ofertas en borrador pueden enviarse');

    const updated = await this.prisma.hcmRcOffer.update({
      where: { id: offer.id },
      data: { status: 'sent', sentAt: new Date() },
    });

    await this.vacancies.transition(organizationId, offer.vacancyKey, userId, 'offer_stage');
    await this.audit.log(organizationId, 'HcmRcOffer', offerKey, 'sent', userId);
    await this.core.emitUserAction(organizationId, 'HcmRcOffer', offerKey, EVENT_TYPES.HCM_RC_OFFER_SENT, {});
    return updated;
  }

  async signOffer(organizationId: string, offerKey: string, userId: string, input: {
    signerName: string; signerEmail: string; signatureData?: string; ipAddress?: string;
  }) {
    const offer = await this.getOffer(organizationId, offerKey);
    const signatureKey = generateRcKey('SIG', (await this.prisma.hcmRcOfferSignature.count({ where: { organizationId } })) + 1);

    const signature = await this.prisma.hcmRcOfferSignature.create({
      data: {
        organizationId,
        signatureKey,
        offerKey,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
        signatureData: input.signatureData,
        ipAddress: input.ipAddress,
      },
    });

    await this.audit.log(organizationId, 'HcmRcOfferSignature', signatureKey, 'signed', userId);
    await this.core.emitUserAction(organizationId, 'HcmRcOfferSignature', signatureKey, EVENT_TYPES.HCM_RC_OFFER_SIGNED, { offerKey });
    return signature;
  }

  async acceptOffer(organizationId: string, offerKey: string, userId: string) {
    const offer = await this.getOffer(organizationId, offerKey);
    if (!['sent', 'draft'].includes(offer.status)) throw new BadRequestException('Oferta no puede aceptarse');

    const candidate = offer.candidate;
    const vacancy = offer.vacancy;
    const empSeq = (await this.prisma.hcmEmployee.count({ where: { organizationId } })) + 1;
    const employeeNumber = generateEmployeeNumberFromCandidate(empSeq);

    const employee = await this.employees.create(organizationId, userId, {
      employeeNumber,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      documentNumber: candidate.documentNumber ?? `TMP-${empSeq}`,
      email: candidate.email,
      phone: candidate.phone ?? undefined,
      companyKey: vacancy.companyKey ?? 'CO-MAIN',
      branchKey: offer.branchKey ?? vacancy.branchKey ?? undefined,
      departmentKey: offer.departmentKey ?? vacancy.departmentKey ?? undefined,
      positionKey: offer.positionKey ?? vacancy.positionKey ?? undefined,
      workCenterKey: vacancy.workCenterKey ?? undefined,
      managerEmployeeKey: offer.managerKey ?? vacancy.hiringManagerKey ?? undefined,
      hireDate: offer.startDate.toISOString().slice(0, 10),
      userId: undefined,
    });

    const contract = await this.contracts.create(organizationId, userId, {
      employeeKey: employee.employeeKey,
      contractType: mapContractType(offer.contractType),
      startDate: offer.startDate.toISOString().slice(0, 10),
      salary: offer.salary,
      currencyKey: offer.currencyKey,
      positionKey: offer.positionKey ?? undefined,
      workCenterKey: vacancy.workCenterKey ?? undefined,
      contractNumber: `CTR-${offer.offerKey}`,
    });

    await this.documents.upload(organizationId, employee.employeeKey, userId, {
      documentType: 'contract',
      title: 'Contrato laboral — Oferta aceptada',
      fileName: `contrato-${offer.offerKey}.pdf`,
      contentType: 'application/pdf',
      contentBase64: Buffer.from(`Contrato generado automáticamente para ${candidate.firstName} ${candidate.lastName}`).toString('base64'),
      isRequired: true,
    });

    await this.documents.upload(organizationId, employee.employeeKey, userId, {
      documentType: 'other',
      title: 'Carta oferta firmada',
      fileName: `oferta-${offer.offerKey}.pdf`,
      contentType: 'application/pdf',
      contentBase64: Buffer.from(`Oferta ${offer.offerKey} aceptada el ${new Date().toISOString()}`).toString('base64'),
    });

    const updatedOffer = await this.prisma.hcmRcOffer.update({
      where: { id: offer.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        employeeKey: employee.employeeKey,
        metadata: {
          ...(offer.metadata as object),
          iamRoleKeys: offer.iamRoleKeys,
          contractKey: contract.contractKey,
        },
      },
    });

    await this.prisma.hcmRcApplication.updateMany({
      where: { organizationId, vacancyKey: offer.vacancyKey, candidateKey: offer.candidateKey },
      data: { status: 'hired' },
    });
    await this.prisma.hcmRcCandidate.updateMany({
      where: { organizationId, candidateKey: offer.candidateKey },
      data: { status: 'hired' },
    });

    await this.vacancies.transition(organizationId, offer.vacancyKey, userId, 'filled');
    await this.onboarding.createPlan(organizationId, userId, {
      offerKey,
      employeeKey: employee.employeeKey,
      candidateKey: offer.candidateKey,
      startDate: offer.startDate.toISOString().slice(0, 10),
    });

    await this.audit.log(organizationId, 'HcmRcOffer', offerKey, 'accepted', userId, { employeeKey: employee.employeeKey });
    await this.core.emitUserAction(organizationId, 'HcmRcOffer', offerKey, EVENT_TYPES.HCM_RC_OFFER_ACCEPTED, {
      employeeKey: employee.employeeKey,
      contractKey: contract.contractKey,
      iamRoleKeys: offer.iamRoleKeys,
    });

    return { offer: updatedOffer, employee, contract };
  }

  async rejectOffer(organizationId: string, offerKey: string, userId: string) {
    const offer = await this.getOffer(organizationId, offerKey);
    const updated = await this.prisma.hcmRcOffer.update({
      where: { id: offer.id },
      data: { status: 'rejected' },
    });
    await this.audit.log(organizationId, 'HcmRcOffer', offerKey, 'rejected', userId);
    return updated;
  }
}
