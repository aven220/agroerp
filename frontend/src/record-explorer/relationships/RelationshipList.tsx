import { Link } from 'react-router-dom';
import type { UreRelationship } from '../types';

interface RelationshipListProps {
  items: UreRelationship[];
}

export function RelationshipList({ items }: RelationshipListProps) {
  if (items.length === 0) {
    return <p className="ure-empty">Sin relaciones vinculadas</p>;
  }

  return (
    <ul className="ure-rel-list">
      {items.map((rel) => (
        <li key={`${rel.entityType}-${rel.id}`}>
          <span className="ure-rel-type">{rel.entityType}</span>
          {rel.href ? (
            <Link to={rel.href} className="ure-rel-link">
              {rel.label}
            </Link>
          ) : (
            <span>{rel.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
