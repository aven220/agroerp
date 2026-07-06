import type { ReactNode } from 'react';
import { Drawer } from '../ui/Drawer';

interface DetailPanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function DetailPanel({ open, title, onClose, children, footer }: DetailPanelProps) {
  return (
    <Drawer open={open} title={title} onClose={onClose}>
      <div className="edw-detail-panel">
        {children}
        {footer ? <div className="edw-detail-footer">{footer}</div> : null}
      </div>
    </Drawer>
  );
}
