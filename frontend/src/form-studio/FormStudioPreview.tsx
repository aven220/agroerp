import { useState, type ReactNode } from 'react';

export type PreviewDevice = 'desktop' | 'tablet' | 'phone-portrait' | 'phone-landscape';

const DEVICE_OPTIONS: Array<{ id: PreviewDevice; label: string; icon: string }> = [
  { id: 'desktop', label: 'Escritorio', icon: '🖥' },
  { id: 'tablet', label: 'Tablet', icon: '📱' },
  { id: 'phone-portrait', label: 'Móvil', icon: '📲' },
  { id: 'phone-landscape', label: 'Horizontal', icon: '↔' },
];

const ZOOM_LEVELS = [75, 90, 100, 110, 125];

interface Props {
  device: PreviewDevice;
  onDeviceChange: (d: PreviewDevice) => void;
  children: ReactNode;
  /** Panel lateral con controles; no abre otra pantalla */
  layout?: 'inline' | 'split';
  showControls?: boolean;
}

export function FormStudioPreview({
  device,
  onDeviceChange,
  children,
  layout = 'split',
  showControls = true,
}: Props) {
  const [zoom, setZoom] = useState(100);
  const [rotated, setRotated] = useState(false);

  const effectiveDevice =
    rotated && (device === 'phone-portrait' || device === 'phone-landscape')
      ? device === 'phone-portrait'
        ? 'phone-landscape'
        : 'phone-portrait'
      : device;

  const controls = showControls ? (
    <aside className="fs-preview-panel" aria-label="Controles de vista previa">
      <h3 className="fs-preview-panel-title">Dispositivo</h3>
      <div className="fs-preview-devices">
        {DEVICE_OPTIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`fs-preview-device-btn${device === d.id ? ' active' : ''}`}
            onClick={() => onDeviceChange(d.id)}
            aria-pressed={device === d.id}
          >
            <span aria-hidden>{d.icon}</span>
            <span>{d.label}</span>
          </button>
        ))}
      </div>

      <h3 className="fs-preview-panel-title">Zoom</h3>
      <div className="fs-preview-zoom">
        {ZOOM_LEVELS.map((z) => (
          <button
            key={z}
            type="button"
            className={`fs-preview-zoom-btn${zoom === z ? ' active' : ''}`}
            onClick={() => setZoom(z)}
          >
            {z}%
          </button>
        ))}
      </div>

      {(device === 'phone-portrait' || device === 'phone-landscape') ? (
        <>
          <h3 className="fs-preview-panel-title">Orientación</h3>
          <button
            type="button"
            className={`fs-preview-rotate-btn${rotated ? ' active' : ''}`}
            onClick={() => setRotated((r) => !r)}
          >
            {rotated ? 'Restaurar vertical' : 'Rotar pantalla'}
          </button>
        </>
      ) : null}
    </aside>
  ) : null;

  const frame = (
    <div
      className={`fs-preview-stage device-${effectiveDevice}`}
      style={{ '--fs-preview-zoom': String(zoom / 100) } as React.CSSProperties}
    >
      <div className="fs-preview-frame">
        <div className="fs-preview-screen form-panel">{children}</div>
      </div>
    </div>
  );

  if (layout === 'inline') {
    return (
      <div className="fs-preview fs-preview-inline">
        {showControls ? (
          <div className="fs-preview-toolbar">
            {DEVICE_OPTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`fs-preview-device-btn compact${device === d.id ? ' active' : ''}`}
                onClick={() => onDeviceChange(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        ) : null}
        {frame}
      </div>
    );
  }

  return (
    <div className="fs-preview fs-preview-split">
      {controls}
      <div className="fs-preview-main">{frame}</div>
    </div>
  );
}
