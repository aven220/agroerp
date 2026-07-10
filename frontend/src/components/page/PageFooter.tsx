import type { ReactNode } from 'react';

interface PageFooterProps {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
}

export function PageFooter({ children, sticky = true, className = '' }: PageFooterProps) {
  const classes = [
    'page-footer',
    sticky ? 'form-actions edw-form-actions' : '',
    className,
  ].filter(Boolean).join(' ');

  return <footer className={classes}>{children}</footer>;
}
