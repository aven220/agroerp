import { useExperienceCenter } from '../../context/ExperienceCenterContext';
import type { ExperienceCenterId } from '../../config/experienceCenters';
import { Tooltip } from '../ui/Tooltip';

const CENTER_ICONS: Record<ExperienceCenterId, string> = {
  operation: '⚙',
  management: '◈',
  implementation: '🧭',
};

export function CenterSelector({ compact = false }: { compact?: boolean }) {
  const { center, setCenter, centers, centerMeta } = useExperienceCenter();

  return (
    <div className="center-selector" role="group" aria-label="Centro de experiencia">
      {!compact ? (
        <span className="center-selector-label" aria-hidden>
          Centro
        </span>
      ) : null}
      <div className="center-selector-pills">
        {centers.map((c) => {
          const active = c.id === center;
          return (
            <Tooltip key={c.id} content={c.description}>
              <button
                type="button"
                className={`center-selector-pill${active ? ' active' : ''}`}
                aria-pressed={active}
                aria-label={c.label}
                onClick={() => {
                  if (!active) setCenter(c.id);
                }}
              >
                <span className="center-selector-icon" aria-hidden>
                  {CENTER_ICONS[c.id]}
                </span>
                {!compact ? <span>{c.shortLabel}</span> : null}
              </button>
            </Tooltip>
          );
        })}
      </div>
      {compact ? (
        <span className="center-selector-current sr-only">{centerMeta.label}</span>
      ) : null}
    </div>
  );
}
