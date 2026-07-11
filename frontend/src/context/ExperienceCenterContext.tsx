/**
 * PM-25 — Selector persistente de centros de experiencia.
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
import { useAuth } from './AuthContext';

interface ExperienceCenterContextValue {
  center: ExperienceCenterId;
  setCenter: (id: ExperienceCenterId, options?: { navigateHome?: boolean }) => void;
  packageId: IndustryPackageId;
  setPackageId: (id: IndustryPackageId) => void;
  experienceNav: NavCategory[];
  centers: typeof EXPERIENCE_CENTERS;
  centerMeta: ReturnType<typeof getCenterMeta>;
}

const ExperienceCenterContext = createContext<ExperienceCenterContextValue | null>(null);

function storageKey(userId: string | undefined, key: string) {
  return `agroerp_${key}_${userId ?? 'anon'}`;
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

  const [packageId, setPackageIdState] = useState<IndustryPackageId>(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId, 'industry_package'));
      if (saved === 'coop-cafe-co') return saved;
    } catch {
      /* ignore */
    }
    return DEFAULT_PACKAGE;
  });

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
    try {
      const saved = localStorage.getItem(storageKey(userId, 'industry_package'));
      if (saved === 'coop-cafe-co') {
        setPackageIdState(saved);
        return;
      }
    } catch {
      /* ignore */
    }
    setPackageIdState(DEFAULT_PACKAGE);
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(storageKey(userId, 'experience_center'), center);
  }, [center, userId]);

  useEffect(() => {
    localStorage.setItem(storageKey(userId, 'industry_package'), packageId);
  }, [packageId, userId]);

  const setCenter = useCallback(
    (id: ExperienceCenterId, options?: { navigateHome?: boolean }) => {
      setCenterState(id);
      if (options?.navigateHome !== false) {
        navigate(getCenterMeta(id).homePath);
      }
    },
    [navigate],
  );

  /** PM-32: el piloto certificado es cooperativa; no permitir bypass a plataforma completa. */
  const setPackageId = useCallback((id: IndustryPackageId) => {
    if (id !== 'coop-cafe-co') return;
    setPackageIdState('coop-cafe-co');
  }, []);

  const experienceNav = useMemo(
    () => getExperienceNav(center, packageId),
    [center, packageId],
  );

  const value = useMemo(
    () => ({
      center,
      setCenter,
      packageId,
      setPackageId,
      experienceNav,
      centers: EXPERIENCE_CENTERS,
      centerMeta: getCenterMeta(center),
    }),
    [center, setCenter, packageId, setPackageId, experienceNav],
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
