import { useRef, type ReactNode } from 'react';
import { useMobile } from '../../context/MobileContext';

interface PullToRefreshProps {
  children: ReactNode;
  disabled?: boolean;
}

export function PullToRefresh({ children, disabled }: PullToRefreshProps) {
  const { isMobile, triggerPullRefresh, pullRefreshing } = useMobile();
  const startY = useRef(0);
  const pulling = useRef(false);

  if (!isMobile || disabled) return <>{children}</>;

  return (
    <div
      className={`mobile-ptr-wrap${pullRefreshing ? ' refreshing' : ''}`}
      onTouchStart={(e) => {
        if (window.scrollY <= 0) {
          startY.current = e.touches[0].clientY;
          pulling.current = true;
        }
      }}
      onTouchMove={(e) => {
        if (!pulling.current) return;
        const delta = e.touches[0].clientY - startY.current;
        if (delta > 80) pulling.current = false;
      }}
      onTouchEnd={async (e) => {
        if (!pulling.current) return;
        const delta = e.changedTouches[0].clientY - startY.current;
        pulling.current = false;
        if (delta > 80) await triggerPullRefresh();
      }}
    >
      {pullRefreshing ? <div className="mobile-ptr-indicator">Actualizando…</div> : null}
      {children}
    </div>
  );
}
