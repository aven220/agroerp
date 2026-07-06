export const IAM_AUTH_PORT = Symbol('IAM_AUTH_PORT');

export interface IamAuthPort {
  beforeLogin(user: {
    id: string;
    organizationId: string;
    email: string;
    mfaEnabled: boolean;
    mustChangePassword: boolean;
    failedLoginAttempts: number;
    lockedAt: Date | null;
    passwordChangedAt: Date | null;
  }, ctx: {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    password: string;
  }): Promise<{ proceed: boolean; mfaRequired?: boolean; reason?: string }>;

  onLoginFailure(email: string, organizationId: string | null, userId: string | null, ctx: {
    ipAddress?: string;
    userAgent?: string;
    reason: string;
  }): Promise<void>;

  onLoginSuccess(userId: string, organizationId: string, ctx: {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
  }): Promise<void>;

  validatePassword(organizationId: string, userId: string | null, password: string): Promise<void>;

  recordPasswordChange(organizationId: string, userId: string, passwordHash: string): Promise<void>;
}
