import { useEffect, useRef, useState } from 'react';

export function useInView(rootMargin = '100px') {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  return { ref, visible };
}

export function useAutoRefresh(callback: () => void, ms?: number, enabled = true) {
  useEffect(() => {
    if (!enabled || !ms) return;
    const id = setInterval(callback, ms);
    return () => clearInterval(id);
  }, [callback, ms, enabled]);
}
