import { useEffect, useState } from 'react';

export type ViewportTier = 'mobile' | 'tablet' | 'desktop' | 'wide';

const QUERIES: Record<ViewportTier, string> = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px) and (max-width: 1439px)',
  wide: '(min-width: 1440px)',
};

function getTier(): ViewportTier {
  if (typeof window === 'undefined') return 'desktop';
  if (window.matchMedia(QUERIES.mobile).matches) return 'mobile';
  if (window.matchMedia(QUERIES.tablet).matches) return 'tablet';
  if (window.matchMedia(QUERIES.wide).matches) return 'wide';
  return 'desktop';
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useViewport() {
  const [tier, setTier] = useState<ViewportTier>(getTier);

  useEffect(() => {
    const update = () => setTier(getTier());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return {
    tier,
    isMobile: tier === 'mobile',
    isTablet: tier === 'tablet',
    isDesktop: tier === 'desktop' || tier === 'wide',
    isTouch: tier === 'mobile' || tier === 'tablet',
  };
}
