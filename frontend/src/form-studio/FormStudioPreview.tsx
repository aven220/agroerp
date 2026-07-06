import type { ReactNode } from 'react';

export type PreviewDevice = 'desktop' | 'tablet' | 'phone-portrait' | 'phone-landscape';

const LABELS: Record<PreviewDevice, string> = {
  desktop: 'Escritorio',
  tablet: 'Tablet',
  'phone-portrait': 'Teléfono',
  'phone-landscape': 'Teléfono horizontal',
};

interface Props {
  device: PreviewDevice;
  onDeviceChange: (d: PreviewDevice) => void;
  children: ReactNode;
}

export function FormStudioPreview({ device, onDeviceChange, children }: Props) {
  return (
    <div className="form-studio-preview">
      <div className="form-studio-device-bar">
        {(Object.keys(LABELS) as PreviewDevice[]).map((d) => (
          <button
            key={d}
            type="button"
            className={`btn btn-sm ${device === d ? 'btn-primary' : ''}`}
            onClick={() => onDeviceChange(d)}
          >
            {LABELS[d]}
          </button>
        ))}
      </div>
      <div className={`form-studio-device-frame device-${device}`}>
        <div className="form-studio-device-screen form-panel">{children}</div>
      </div>
    </div>
  );
}
