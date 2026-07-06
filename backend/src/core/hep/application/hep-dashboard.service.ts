import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HepAuditService } from './hep-audit.service';
import {
  DEFAULT_HEP_QUICK_LINKS,
  fullDisplayName,
  generateHepKey,
  isBirthdayThisMonth,
  isBirthdayToday,
  newsIsActive,
  noticeIsActive,
  resolveContact,
  resolvePhotoUrl,
  validateProfileUpdate,
} from '../domain/hep-portal.engine';

@Injectable()
export class HepDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: HepAuditService,
    private readonly core: CoreEngineService,
  ) {}

  async resolveEmployeeKey(organizationId: string, userId: string, employeeKey?: string): Promise<string> {
    if (employeeKey) return employeeKey;
    const byUser = await this.prisma.hcmEmployee.findFirst({
      where: { organizationId, userId },
      select: { employeeKey: true },
    });
    if (byUser) return byUser.employeeKey;
    const profile = await this.prisma.hepProfile.findFirst({
      where: { organizationId, userId },
      select: { employeeKey: true },
    });
    if (profile) return profile.employeeKey;
    throw new NotFoundException('Empleado no vinculado al usuario');
  }

  async seed(organizationId: string, userId: string) {
    const links = await this.prisma.hepQuickLink.count({ where: { organizationId } });
    if (links === 0) {
      for (const link of DEFAULT_HEP_QUICK_LINKS) {
        await this.prisma.hepQuickLink.create({
          data: {
            organizationId,
            linkKey: link.linkKey,
            label: link.label,
            description: link.description,
            routePath: link.routePath,
            icon: link.icon,
            sortOrder: link.sortOrder,
            moduleCode: link.moduleCode,
          },
        });
      }
    }

    const newsCount = await this.prisma.hepNewsItem.count({ where: { organizationId } });
    if (newsCount === 0) {
      await this.prisma.hepNewsItem.create({
        data: {
          organizationId,
          newsKey: generateHepKey('NWS', 1),
          title: 'Bienvenido al Portal del Empleado',
          summary: 'Consulta tu información laboral y accesos rápidos desde un solo lugar.',
          body: 'El Portal del Empleado centraliza tu perfil, avisos corporativos y accesos a los módulos de autoservicio.',
          isPinned: true,
          createdBy: userId,
        },
      });
    }

    const noticeCount = await this.prisma.hepNotice.count({ where: { organizationId } });
    if (noticeCount === 0) {
      await this.prisma.hepNotice.create({
        data: {
          organizationId,
          noticeKey: generateHepKey('NTC', 1),
          title: 'Actualiza tus datos de contacto',
          message: 'Mantén tu información personal al día para comunicaciones internas.',
          priority: 'normal',
          createdBy: userId,
        },
      });
    }

    await this.audit.log({
      organizationId,
      action: 'query',
      resource: 'HepSeed',
      userId,
      details: { seeded: true },
    });

    return this.dashboard(organizationId, userId);
  }

  async dashboard(organizationId: string, userId: string, employeeKey?: string, meta?: { ipAddress?: string; userAgent?: string }) {
    const key = await this.resolveEmployeeKey(organizationId, userId, employeeKey);
    const profileCard = await this.profile(organizationId, userId, key, false);
    const [news, notices, quickLinks, birthdays] = await Promise.all([
      this.listNews(organizationId),
      this.listNotices(organizationId),
      this.listQuickLinks(organizationId),
      this.listBirthdays(organizationId),
    ]);

    await this.audit.log({
      organizationId,
      action: 'query',
      resource: 'HepDashboard',
      employeeKey: key,
      userId,
      details: { news: news.length, notices: notices.length },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      profile: profileCard,
      news,
      notices,
      quickLinks,
      birthdays,
      moduleAccess: quickLinks.map((l) => ({
        moduleCode: l.moduleCode,
        label: l.label,
        routePath: l.routePath,
        icon: l.icon,
      })),
    };
  }

  async profile(organizationId: string, userId: string, employeeKey?: string, auditQuery = true) {
    const key = await this.resolveEmployeeKey(organizationId, userId, employeeKey);
    const employee = await this.prisma.hcmEmployee.findFirst({
      where: { organizationId, employeeKey: key },
      include: {
        contracts: { where: { status: 'active' }, orderBy: { startDate: 'desc' }, take: 1 },
      },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const [portalProfile, position, department, manager, company] = await Promise.all([
      this.prisma.hepProfile.findFirst({ where: { organizationId, employeeKey: key } }),
      employee.positionKey
        ? this.prisma.hcmPosition.findFirst({ where: { organizationId, positionKey: employee.positionKey } })
        : null,
      employee.departmentKey
        ? this.prisma.hcmDepartment.findFirst({ where: { organizationId, departmentKey: employee.departmentKey } })
        : null,
      employee.managerEmployeeKey
        ? this.prisma.hcmEmployee.findFirst({
            where: { organizationId, employeeKey: employee.managerEmployeeKey },
            select: { employeeKey: true, displayName: true, firstName: true, lastName: true, email: true, positionKey: true },
          })
        : null,
      this.prisma.hcmCompany.findFirst({ where: { organizationId, companyKey: employee.companyKey } }),
    ]);

    const contract = employee.contracts[0] ?? null;
    const contact = resolveContact(portalProfile ?? {}, employee);
    const photoUrl = resolvePhotoUrl(portalProfile?.photoUrl, employee.photoUrl);

    if (auditQuery) {
      await this.audit.log({
        organizationId,
        action: 'query',
        resource: 'HepProfile',
        employeeKey: key,
        userId,
      });
    }

    return {
      employeeKey: employee.employeeKey,
      employeeNumber: employee.employeeNumber,
      fullName: fullDisplayName(employee),
      photoUrl,
      position: position ? { positionKey: position.positionKey, name: position.name, code: position.code } : null,
      area: department ? { departmentKey: department.departmentKey, name: department.name, code: department.code } : null,
      manager: manager
        ? {
            employeeKey: manager.employeeKey,
            fullName: fullDisplayName(manager),
            email: manager.email,
            positionKey: manager.positionKey,
          }
        : null,
      company: company ? { companyKey: company.companyKey, name: company.name } : { companyKey: employee.companyKey, name: employee.companyKey },
      employmentStatus: employee.employmentStatus,
      hireDate: employee.hireDate,
      contract: contract
        ? {
            contractKey: contract.contractKey,
            contractType: contract.contractType,
            status: contract.status,
            startDate: contract.startDate,
            endDate: contract.endDate,
            salary: contract.salary,
            currencyKey: contract.currencyKey,
          }
        : null,
      contact,
      birthDate: employee.birthDate,
      isBirthdayToday: isBirthdayToday(employee.birthDate),
      portalProfile: portalProfile
        ? {
            profileKey: portalProfile.profileKey,
            bio: portalProfile.bio,
            preferences: portalProfile.preferences,
          }
        : null,
    };
  }

  async updateProfile(organizationId: string, userId: string, input: {
    employeeKey?: string;
    photoUrl?: string;
    personalEmail?: string;
    personalPhone?: string;
    personalMobile?: string;
    address?: string;
    city?: string;
    bio?: string;
  }, meta?: { ipAddress?: string; userAgent?: string }) {
    const key = await this.resolveEmployeeKey(organizationId, userId, input.employeeKey);
    const validation = validateProfileUpdate(input);
    if (!validation.valid) throw new BadRequestException(validation.errors.join('; '));

    const existing = await this.prisma.hepProfile.findFirst({ where: { organizationId, employeeKey: key } });
    const data = {
      photoUrl: input.photoUrl,
      personalEmail: input.personalEmail,
      personalPhone: input.personalPhone,
      personalMobile: input.personalMobile,
      address: input.address,
      city: input.city,
      bio: input.bio,
      userId,
    };

    const profile = existing
      ? await this.prisma.hepProfile.update({ where: { id: existing.id }, data })
      : await this.prisma.hepProfile.create({
          data: {
            organizationId,
            profileKey: generateHepKey('PRF', (await this.prisma.hepProfile.count({ where: { organizationId } })) + 1),
            employeeKey: key,
            ...data,
          },
        });

    await this.audit.log({
      organizationId,
      action: 'profile_update',
      resource: 'HepProfile',
      employeeKey: key,
      userId,
      details: { fields: Object.keys(input).filter((k) => k !== 'employeeKey') },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    await this.core.emitUserAction(organizationId, 'HepProfile', profile.profileKey, EVENT_TYPES.HEP_PROFILE_UPDATED, { employeeKey: key });

    return this.profile(organizationId, userId, key, false);
  }

  async recordLogin(organizationId: string, userId: string, employeeKey?: string, meta?: { ipAddress?: string; userAgent?: string }) {
    const key = await this.resolveEmployeeKey(organizationId, userId, employeeKey).catch(() => undefined);
    await this.audit.log({
      organizationId,
      action: 'login',
      resource: 'HepPortal',
      employeeKey: key,
      userId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    await this.core.emitUserAction(organizationId, 'HepPortal', key ?? userId, EVENT_TYPES.HEP_PORTAL_LOGIN, { employeeKey: key });
    return { loggedIn: true, employeeKey: key, at: new Date().toISOString() };
  }

  async listNews(organizationId: string) {
    const rows = await this.prisma.hepNewsItem.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: 20,
    });
    return rows.filter((n) => newsIsActive(n));
  }

  async listNotices(organizationId: string) {
    const rows = await this.prisma.hepNotice.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ priority: 'desc' }, { startsAt: 'desc' }],
      take: 20,
    });
    return rows.filter((n) => noticeIsActive(n));
  }

  listQuickLinks(organizationId: string) {
    return this.prisma.hepQuickLink.findMany({
      where: { organizationId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listBirthdays(organizationId: string) {
    const employees = await this.prisma.hcmEmployee.findMany({
      where: { organizationId, employmentStatus: 'active', birthDate: { not: null } },
      select: {
        employeeKey: true,
        displayName: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        photoUrl: true,
        departmentKey: true,
        positionKey: true,
      },
    });
    return employees
      .filter((e) => isBirthdayThisMonth(e.birthDate))
      .map((e) => ({
        employeeKey: e.employeeKey,
        fullName: fullDisplayName(e),
        birthDate: e.birthDate,
        photoUrl: e.photoUrl,
        departmentKey: e.departmentKey,
        positionKey: e.positionKey,
        isToday: isBirthdayToday(e.birthDate),
      }))
      .sort((a, b) => {
        const da = a.birthDate ? new Date(a.birthDate).getUTCDate() : 0;
        const db = b.birthDate ? new Date(b.birthDate).getUTCDate() : 0;
        return da - db;
      });
  }

  async mobileSync(organizationId: string, userId: string, employeeKey?: string) {
    const dashboard = await this.dashboard(organizationId, userId, employeeKey);
    return { ...dashboard, syncedAt: new Date().toISOString() };
  }
}
