import { useEffect, useRef } from 'react';

/** Evita setState tras desmontar en efectos async o polling. */
export function useIsMounted() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
