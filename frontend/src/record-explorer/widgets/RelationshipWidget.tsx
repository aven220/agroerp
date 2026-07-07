import { WidgetShell } from '../components/WidgetShell';
import { RelationshipList } from '../relationships/RelationshipList';
import type { UreRelationship } from '../types';

interface RelationshipWidgetProps {
  relationships: UreRelationship[];
}

export function RelationshipWidget({ relationships }: RelationshipWidgetProps) {
  return (
    <WidgetShell
      title="Relaciones"
      id="ure-relationships"
      empty={relationships.length === 0}
    >
      <RelationshipList items={relationships} />
    </WidgetShell>
  );
}
