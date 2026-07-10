import type { ReactNode } from 'react';
import { PageSectionPlain } from './PageSection';
import { SectionTitle } from './SectionTitle';

export interface InfoGridItem {
  term: string;
  detail: ReactNode;
}

interface InfoGridProps {
  children?: ReactNode;
  className?: string;
}

export function InfoGrid({ children, className = '' }: InfoGridProps) {
  return <div className={`detail-grid info-grid ${className}`.trim()}>{children}</div>;
}

interface InfoSectionProps {
  title: string;
  items?: InfoGridItem[];
  children?: ReactNode;
}

export function InfoSection({ title, items, children }: InfoSectionProps) {
  return (
    <PageSectionPlain title={title}>
      {items ? <DescriptionList items={items} /> : children}
    </PageSectionPlain>
  );
}

export function DescriptionList({ items }: { items: InfoGridItem[] }) {
  return (
    <dl className="description-list">
      {items.map((item) => (
        <div key={item.term} className="description-list-row">
          <dt>{item.term}</dt>
          <dd>{item.detail ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="info-field form-group">
      <span className="ds-field-label">{label}</span>
      <span className="info-field-value">{value ?? '—'}</span>
    </div>
  );
}

export function ReadonlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input value={value == null || value === '' ? '—' : String(value)} readOnly className="readonly" />
    </div>
  );
}
