import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import { getEffectivePermissions } from '../api/iam';
import { ensureDomainSchemas } from '../api/identity';
import type { UserProfile } from '../types';

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    roles: string[];
    permissions?: string[];
  };
  mustChangePassword?: boolean;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ mfaRequired?: boolean; mustChangePassword?: boolean; mfaToken?: string }>;
  applyLoginResult: (res: LoginResult) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const profile = await authApi.getMe();
    let effective = { permissions: [] as string[], roles: [] as string[] };
    try {
      effective = await getEffectivePermissions() as { permissions: string[]; roles: string[] };
    } catch {
      /* fallback below */
    }

    setUser({
      ...profile,
      permissions: effective.permissions?.length ? effective.permissions : [],
      roles:
        effective.roles?.length
          ? effective.roles
          : (profile.roles as (string | { slug: string })[]).map((r) =>
              typeof r === 'string' ? r : r.slug,
            ),
    });
  }, []);

  const applyLoginResult = useCallback(
    async (res: LoginResult) => {
      setUser({
        id: res.user.id,
        email: res.user.email,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        organizationId: res.user.organizationId,
        roles: res.user.roles,
        permissions: res.user.permissions ?? [],
        status: 'active',
        organization: {
          id: res.user.organizationId,
          name: '',
          slug: '',
        },
      });
      await refreshProfile();
      if (res.user.roles.includes('admin')) {
        await ensureDomainSchemas();
      }
    },
    [refreshProfile],
  );

  useEffect(() => {
    const token = localStorage.getItem('agroerp_token');
    if (!token) {
      setLoading(false);
      return;
    }

    refreshProfile()
      .catch(() => {
        localStorage.removeItem('agroerp_token');
        setUser(null);
      })
      .finally(() => setLoading(false));

    const onUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('agroerp:unauthorized', onUnauthorized);
    return () => window.removeEventListener('agroerp:unauthorized', onUnauthorized);
  }, [refreshProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      if (res.mfaRequired && res.mfaToken) {
        return {
          mfaRequired: true,
          mfaToken: res.mfaToken,
          mustChangePassword: res.mustChangePassword,
        };
      }
      await applyLoginResult(res as LoginResult);
      return { mustChangePassword: res.mustChangePassword };
    },
    [applyLoginResult],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (perm: string) => {
      if (!user?.permissions) return false;
      if (user.permissions.includes('*:*')) return true;
      if (user.permissions.includes(perm)) return true;
      const [resource] = perm.split(':');
      return user.permissions.includes(`${resource}:*`);
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, applyLoginResult, logout, refreshProfile, hasPermission }),
    [user, loading, login, applyLoginResult, logout, refreshProfile, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
