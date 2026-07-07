import { WidgetShell } from '../components/WidgetShell';
import type { UrePhoto } from '../types';

interface GalleryWidgetProps {
  photos: UrePhoto[];
}

export function GalleryWidget({ photos }: GalleryWidgetProps) {
  return (
    <WidgetShell title="Fotos" id="ure-photos" empty={photos.length === 0}>
      <div className="ure-gallery">
        {photos.map((photo) => (
          <figure key={photo.id} className="ure-gallery-item">
            {photo.url ? (
              <img src={photo.url} alt={photo.title ?? 'Foto'} loading="lazy" />
            ) : (
              <div className="ure-gallery-placeholder">
                <span>{photo.title ?? 'Foto'}</span>
                {photo.contentId ? (
                  <small className="ure-gallery-id">{photo.contentId}</small>
                ) : null}
              </div>
            )}
            {photo.capturedAt ? (
              <figcaption>{photo.capturedAt.slice(0, 10)}</figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </WidgetShell>
  );
}
