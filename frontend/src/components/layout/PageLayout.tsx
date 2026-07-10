import type { ReactNode } from 'react';

interface PageLayoutProps {
  /** Primary page content below header/toolbar */
  children: ReactNode;
  /** Optional filter bar, tabs, or action row */
  toolbar?: ReactNode;
  /** Optional sticky contextual footer (form actions, pagination) */
  footer?: ReactNode;
}

/**
 * Standard enterprise page body — visual structure only.
 * Pair with `<Header />` as PageHeader. No business logic.
 */
export function PageLayout({ children, toolbar, footer }: PageLayoutProps) {
  return (
    <div className="page-layout">
      {toolbar ? <div className="page-toolbar">{toolbar}</div> : null}
      <div className="page-body">{children}</div>
      {footer ? <div className="page-footer">{footer}</div> : null}
    </div>
  );
}
