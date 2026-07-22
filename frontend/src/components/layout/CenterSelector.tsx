import { useExperienceCenter } from '../../context/ExperienceCenterContext';
import type { ExperienceCenterId } from '../../config/experienceCenters';
import { NavIcon, SidebarChromeIcons } from './navIcons';

const CENTER_ICONS: Record<ExperienceCenterId, string> = {
  operation: 'shopping-cart',
  management: 'bar-chart-3',
  implementation: 'settings',
};

/**
 * PM-41B — Selector de centro (dropdown compacto bajo el logo).
 */
export function CenterSelector({ compact = false }: { compact?: boolean }) {
  const { center, setCenter, centers, centerMeta } = useExperienceCenter();

  if (compact) {
    return (
      <div className="esb-center-compact" role="group" aria-label="Centro de experiencia">
        {centers.map((c) => {
          const active = c.id === center;
          return (
            <button
              key={c.id}
              type="button"
              className={`esb-center-pill${active ? ' is-active' : ''}`}
              aria-pressed={active}
              title={c.description}
              onClick={() => {
                if (!active) setCenter(c.id);
              }}
            >
              <NavIcon name={CENTER_ICONS[c.id]} size={16} />
              <span className="sr-only">{c.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="esb-center-selector" role="group" aria-label="Centro de experiencia">
      <span className="esb-center-label">Centro</span>
      <div className="esb-center-control">
        <NavIcon name={CENTER_ICONS[center]} size={16} className="esb-center-leading" />
        <select
          className="esb-center-select"
          value={center}
          aria-label={`Centro actual: ${centerMeta.label}`}
          onChange={(e) => {
            const next = e.target.value as ExperienceCenterId;
            if (next !== center) setCenter(next);
          }}
        >
          {centers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shortLabel}
            </option>
          ))}
        </select>
        <SidebarChromeIcons.chevronDown size={14} strokeWidth={1.75} className="esb-center-caret" />
      </div>
    </div>
  );
}
