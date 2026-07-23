/**
 * PM-25 — Selector persistente de centros + licencia de producto de la organización.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_PACKAGE,
  EXPERIENCE_CENTERS,
  getCenterMeta,
  getExperienceNav,
  resolveDefaultCenter,
  type ExperienceCenterId,
  type IndustryPackageId,
} from '../config/experienceCenters';
import type { NavCategory } from '../config/navigation';
import type { ProductPackageId } from '../config/productModules';
import { getOrgProductLicense } from '../api/organization';
import { useAuth } from './AuthContext';

interface ExperienceCenterContextValue {
  center: ExperienceCenterId;
  setCenter: (id: ExperienceCenterId, options?: { navigateHome?: boolean }) => void;
  packageId: ProductPackageId;
  enabledModules: string[];
  /** Actualiza estado local (tras guardar en API o al sincronizar). */
  applyOrgLicense: (license: { packageId: ProductPackageId; enabledModules?: string[] }) => void;
  /** @deprecated Usar pantalla de paquete / applyOrgLicense — no persiste en org. */
  setPackageId: (id: IndustryPackageId | ProductPackageId) => void;
  experienceNav: NavCategory[];
  centers: typeof EXPERIENCE_CENTERS;
  centerMeta: ReturnType<typeof getCenterMeta>;
  licenseLoading: boolean;
}

const ExperienceCenterContext = createContext<ExperienceCenterContextValue | null>(null);

function storageKey(userId: string | undefined, key: string) {
  return `agroerp_${key}_${userId ?? 'anon'}`;
}

function asPackageId(value: unknown): ProductPackageId {
  if (value === 'full-platform' || value === 'custom' || value === 'coop-cafe-co') return value;
  return DEFAULT_PACKAGE;
}

export function ExperienceCenterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;

  const [center, setCenterState] = useState<ExperienceCenterId>(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId, 'experience_center'));
      if (saved === 'operation' || saved === 'management' || saved === 'implementation') {
        return saved;
      }
    } catch {
      /* ignore */
    }
    return resolveDefaultCenter(user?.roles ?? []);
  });

  const [packageId, setPackageIdState] = useState<ProductPackageId>(() => {
    const fromUser = user?.organization?.productLicense?.packageId;
    if (fromUser) return asPackageId(fromUser);
    return DEFAULT_PACKAGE;
  });
  const [enabledModules, setEnabledModules] = useState<string[]>(
    () => user?.organization?.productLicense?.enabledModules ?? [],
  );
  const [licenseLoading, setLicenseLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId, 'experience_center'));
      if (saved === 'operation' || saved === 'management' || saved === 'implementation') {
        setCenterState(saved);
        return;
      }
    } catch {
      /* ignore */
    }
    if (user?.roles?.length) {
      setCenterState(resolveDefaultCenter(user.roles));
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(storageKey(userId, 'experience_center'), center);
  }, [center, userId]);

  const applyOrgLicense = useCallback(
    (license: { packageId: ProductPackageId; enabledModules?: string[] }) => {
      const next = asPackageId(license.packageId);
      setPackageIdState(next);
      setEnabledModules(license.enabledModules ?? []);
      try {
        localStorage.setItem(storageKey(userId, 'industry_package'), next);
        localStorage.setItem(
          storageKey(userId, 'industry_modules'),
          JSON.stringify(license.enabledModules ?? []),
        );
      } catch {
        /* ignore */
      }
    },
    [userId],
  );

  /** Sincroniza licencia desde /auth/me o API de organización. */
  useEffect(() => {
    if (!userId) return;

    const fromMe = user?.organization?.productLicense;
    if (fromMe?.packageId) {
      applyOrgLicense({
        packageId: asPackageId(fromMe.packageId),
        enabledModules: fromMe.enabledModules ?? [],
      });
    }

    let cancelled = false;
    setLicenseLoading(true);
    getOrgProductLicense()
      .then((license) => {
        if (cancelled) return;
        applyOrgLicense({
          packageId: asPackageId(license.packageId),
          enabledModules: license.enabledModules ?? [],
        });
      })
      .catch(() => {
        /* sin permiso organization:read — se mantiene /me o default */
      })
      .finally(() => {
        if (!cancelled) setLicenseLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, user?.organization?.productLicense?.packageId, applyOrgLicense]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCenter = useCallback(
    (id: ExperienceCenterId, options?: { navigateHome?: boolean }) => {
      setCenterState(id);
      if (options?.navigateHome !== false) {
        navigate(getCenterMeta(id).homePath);
      }
    },
    [navigate],
  );

  /** Solo actualiza UI local; la persistencia real es updateOrgProductLicense. */
  const setPackageId = useCallback(
    (id: IndustryPackageId | ProductPackageId) => {
      applyOrgLicense({ packageId: asPackageId(id), enabledModules });
    },
    [applyOrgLicense, enabledModules],
  );

  const experienceNav = useMemo(
    () => getExperienceNav(center, packageId === 'custom' ? 'full-platform' : packageId),
    [center, packageId],
  );

  const value = useMemo(
    () => ({
      center,
      setCenter,
      packageId,
      enabledModules,
      applyOrgLicense,
      setPackageId,
      experienceNav,
      centers: EXPERIENCE_CENTERS,
      centerMeta: getCenterMeta(center),
      licenseLoading,
    }),
    [
      center,
      setCenter,
      packageId,
      enabledModules,
      applyOrgLicense,
      setPackageId,
      experienceNav,
      licenseLoading,
    ],
  );

  return (
    <ExperienceCenterContext.Provider value={value}>
      {children}
    </ExperienceCenterContext.Provider>
  );
}

export function useExperienceCenter() {
  const ctx = useContext(ExperienceCenterContext);
  if (!ctx) throw new Error('useExperienceCenter must be used within ExperienceCenterProvider');
  return ctx;
}

export function useExperienceCenterOptional() {
  return useContext(ExperienceCenterContext);
}
