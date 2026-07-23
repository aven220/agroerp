import { useExperienceCenter } from '../../context/ExperienceCenterContext';
import type { ExperienceCenterId } from '../../config/experienceCenters';
import { NavIcon, SidebarChromeIcons } from './navIcons';

const CENTER_ICONS: Record<ExperienceCenterId, string> = {
  operation: 'shopping-cart',
  management: 'bar-chart-3',
  implementation: 'settings',
};

/**
 * PM-43 — Selector de centro como tarjeta enterprise.
 */
export function CenterSelector({ compact = false }: { compact?: boolean }) {
  const { center, setCenter, centers, centerMeta } = useExperienceCenter();

  if (compact) {
    return (
      <div className="esb-center-compact" role="group" aria-label="Centro de trabajo">
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
    <div className="esb-center-card" role="group" aria-label="Centro de trabajo">
      <span className="esb-center-card-label">Centro de trabajo</span>
      <div className="esb-center-card-control">
        <span className="esb-center-card-icon" aria-hidden>
          <NavIcon name={CENTER_ICONS[center]} size={18} />
        </span>
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
        <SidebarChromeIcons.chevronDown size={16} strokeWidth={1.75} className="esb-center-caret" />
      </div>
    </div>
  );
}
