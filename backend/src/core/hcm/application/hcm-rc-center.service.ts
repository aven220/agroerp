import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { HcmAuditService } from './hcm-audit.service';
import { HcmRcVacancyService } from './hcm-rc-vacancy.service';
import { HcmRcRecruitmentService } from './hcm-rc-recruitment.service';
import { HcmRcSelectionService } from './hcm-rc-selection.service';
import { HcmRcHiringService } from './hcm-rc-hiring.service';
import { HcmRcOnboardingService } from './hcm-rc-onboarding.service';

@Injectable()
export class HcmRcCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HcmAuditService,
    private readonly vacancies: HcmRcVacancyService,
    private readonly recruitment: HcmRcRecruitmentService,
    private readonly selection: HcmRcSelectionService,
    private readonly hiring: HcmRcHiringService,
    private readonly onboarding: HcmRcOnboardingService,
  ) {}

  async center(organizationId: string) {
    const [
      vacancyCount,
      openVacancies,
      candidateCount,
      applicationCount,
      interviewCount,
      offerCount,
      pendingOffers,
      onboardingCount,
      activeOnboarding,
    ] = await Promise.all([
      this.prisma.hcmRcVacancy.count({ where: { organizationId } }),
      this.prisma.hcmRcVacancy.count({ where: { organizationId, status: { in: ['open', 'in_selection', 'offer_stage'] } } }),
      this.prisma.hcmRcCandidate.count({ where: { organizationId } }),
      this.prisma.hcmRcApplication.count({ where: { organizationId } }),
      this.prisma.hcmRcInterview.count({ where: { organizationId, status: 'scheduled' } }),
      this.prisma.hcmRcOffer.count({ where: { organizationId } }),
      this.prisma.hcmRcOffer.count({ where: { organizationId, status: { in: ['draft', 'sent'] } } }),
      this.prisma.hcmRcOnboardingPlan.count({ where: { organizationId } }),
      this.prisma.hcmRcOnboardingPlan.count({ where: { organizationId, status: 'active' } }),
    ]);

    const recentVacancies = await this.prisma.hcmRcVacancy.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { vacancyKey: true, title: true, status: true, targetHireDate: true },
    });

    return {
      vacancyCount,
      openVacancies,
      candidateCount,
      applicationCount,
      interviewCount,
      offerCount,
      pendingOffers,
      onboardingCount,
      activeOnboarding,
      recentVacancies,
    };
  }

  async seed(organizationId: string, userId: string) {
    const existing = await this.prisma.hcmRcVacancy.count({ where: { organizationId } });
    if (existing > 0) return this.center(organizationId);

    const vacancy = await this.vacancies.create(organizationId, userId, {
      title: 'Analista de Operaciones Agrícolas',
      positionKey: 'POS-OPS',
      departmentKey: 'DEPT-OPS',
      companyKey: 'CO-MAIN',
      branchKey: 'BR-HQ',
      jobProfile: 'Gestión de operaciones de campo, coordinación de equipos y reportes operativos.',
      contractType: 'indefinite',
      salaryMin: 3000000,
      salaryMax: 4500000,
      location: 'Bogotá',
      targetHireDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      headcount: 1,
    });

    await this.vacancies.submitForApproval(organizationId, vacancy.vacancyKey, userId);
    await this.vacancies.decideApproval(organizationId, vacancy.vacancyKey, 1, userId, true, 'Aprobado demo');
    await this.vacancies.publish(organizationId, vacancy.vacancyKey, userId, { internal: true, external: true });

    const candidate = await this.recruitment.createCandidate(organizationId, userId, {
      firstName: 'Laura',
      lastName: 'Martínez',
      email: 'laura.martinez.demo@agroerp.com',
      phone: '3001234567',
      skills: ['Operaciones', 'Comunicación', 'Conocimiento técnico', 'Trabajo en equipo'],
      source: 'external',
    });

    await this.recruitment.applyToVacancy(organizationId, userId, vacancy.vacancyKey, candidate.candidateKey);
    await this.selection.autoFilterApplications(organizationId, vacancy.vacancyKey, userId);
    await this.selection.computeRanking(organizationId, vacancy.vacancyKey, userId);

    const offer = await this.hiring.createOffer(organizationId, userId, {
      vacancyKey: vacancy.vacancyKey,
      candidateKey: candidate.candidateKey,
      salary: 3800000,
      contractType: 'indefinite',
      startDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      positionKey: 'POS-OPS',
      departmentKey: 'DEPT-OPS',
      branchKey: 'BR-HQ',
    });

    await this.audit.log(organizationId, 'HcmRcConfig', 'seed', 'completed', userId);
    return { center: await this.center(organizationId), demoVacancyKey: vacancy.vacancyKey, demoCandidateKey: candidate.candidateKey, demoOfferKey: offer.offerKey };
  }

  async mobileSync(organizationId: string) {
    const [center, vacancies, interviews, onboardingPlans] = await Promise.all([
      this.center(organizationId),
      this.vacancies.list(organizationId, { status: 'open' }),
      this.selection.listInterviews(organizationId, { upcoming: true }),
      this.onboarding.listPlans(organizationId, { status: 'active' }),
    ]);
    return { center, vacancies, interviews, onboardingPlans, syncedAt: new Date().toISOString() };
  }
}
