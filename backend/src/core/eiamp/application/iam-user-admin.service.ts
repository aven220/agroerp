import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { UsersService } from '@/core/identity/application/users.service';
import { IAM_AUTH_PORT, IamAuthPort } from '../domain/iam-auth.port';
import { Inject, Optional } from '@nestjs/common';
import { IamSecurityPolicyService } from './iam-security-policy.service';
import { IamAuditService } from './iam-audit.service';

@Injectable()
export class IamUserAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly policies: IamSecurityPolicyService,
    private readonly audit: IamAuditService,
    @Optional() @Inject(IAM_AUTH_PORT) private readonly iam?: IamAuthPort,
  ) {}

  async resetPassword(organizationId: string, userId: string, newPassword: string, actorId: string) {
    if (this.iam) await this.iam.validatePassword(organizationId, userId, newPassword);
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash, mustChangePassword: true },
    });
    if (this.iam) await this.iam.recordPasswordChange(organizationId, userId, hash);
    await this.audit.record(organizationId, 'password_reset', { userId, actorId });
    return { success: true };
  }

  async changePassword(organizationId: string, userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user?.passwordHash) throw new NotFoundException('Usuario no encontrado');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ForbiddenException('Contraseña actual incorrecta');
    if (this.iam) await this.iam.validatePassword(organizationId, userId, newPassword);
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    if (this.iam) await this.iam.recordPasswordChange(organizationId, userId, hash);
    return { success: true };
  }

  async lockUser(organizationId: string, userId: string, reason: string, actorId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'locked', lockedAt: new Date(), lockedReason: reason },
    });
    await this.audit.record(organizationId, 'user_locked', { userId, actorId, details: { reason } });
    return { success: true };
  }

  async unlockUser(organizationId: string, userId: string, actorId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'active', lockedAt: null, lockedReason: null, failedLoginAttempts: 0 },
    });
    return { success: true };
  }

  async softDelete(organizationId: string, userId: string, actorId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), status: 'inactive' },
    });
    await this.audit.record(organizationId, 'user_deleted', { userId, actorId });
    return { success: true };
  }
}
