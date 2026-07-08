import { useInspectorContext } from './InspectorContext';
import type { InspectorGroupId } from './types';

export function InspectorTabs() {
  const { view, activeGroupId, setActiveGroupId } = useInspectorContext();

  if (!view || view.groups.length <= 1) return null;

  return (
    <nav className="inspector-tabs" aria-label="Grupos del inspector">
      {view.groups.map((group) => {
        const groupId = group.definition.id as InspectorGroupId;
        const active = activeGroupId === groupId;
        return (
          <button
            key={group.definition.id}
            type="button"
            className={`inspector-tab ${active ? 'active' : ''}`}
            aria-selected={active}
            onClick={() => setActiveGroupId(groupId)}
          >
            {group.definition.title}
          </button>
        );
      })}
    </nav>
  );
}
