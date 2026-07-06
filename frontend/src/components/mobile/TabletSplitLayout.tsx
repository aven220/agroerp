import type { ReactNode } from 'react';

interface TabletSplitLayoutProps {
  list: ReactNode;
  detail?: ReactNode;
  showDetail?: boolean;
}

export function TabletSplitLayout({ list, detail, showDetail }: TabletSplitLayoutProps) {
  return (
    <div className={`tablet-split${showDetail && detail ? ' has-detail' : ''}`}>
      <div className="tablet-split-list">{list}</div>
      {showDetail && detail ? <div className="tablet-split-detail">{detail}</div> : null}
    </div>
  );
}
