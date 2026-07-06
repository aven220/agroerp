import { useState } from 'react';
import { STUDIO_COMPONENTS, getComponentsByGroup, type StudioComponentDef } from './form-field-catalog';
import type { FormFieldDefinition } from '../api/forms';

interface Props {
  onAdd: (field: FormFieldDefinition) => void;
  selectedType?: string;
}

export function ComponentLibraryPanel({ onAdd, selectedType }: Props) {
  const [search, setSearch] = useState('');
  const [learning, setLearning] = useState<StudioComponentDef | null>(null);
  const groups = getComponentsByGroup();

  const filtered = STUDIO_COMPONENTS.filter(
    (c) =>
      !search ||
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <aside className="designer-palette panel form-studio-library">
      <h3>Biblioteca de componentes</h3>
      <input
        className="form-studio-search"
        placeholder="Buscar componente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="form-studio-component-list">
        {Array.from(groups.entries()).map(([group, items]) => {
          const visible = items.filter((c) => filtered.includes(c));
          if (!visible.length) return null;
          return (
            <div key={group} className="form-studio-group">
              <h4>{group}</h4>
              <div className="palette-grid">
                {visible.map((comp) => (
                  <button
                    key={comp.id}
                    type="button"
                    className={`btn btn-sm palette-item ${selectedType === comp.type ? 'selected' : ''}`}
                    onClick={() => onAdd(comp.createField(Date.now()))}
                    onContextMenu={(e) => { e.preventDefault(); setLearning(comp); }}
                    title="Clic: agregar · Clic derecho: aprender"
                  >
                    {comp.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {learning && (
        <div className="form-studio-learning">
          <button type="button" className="btn btn-sm" onClick={() => setLearning(null)}>×</button>
          <h4>{learning.label}</h4>
          <p>{learning.description}</p>
          <p><strong>Casos de uso:</strong> {learning.useCases.join(' · ')}</p>
          <p><strong>Configuración:</strong> {learning.configTips.join(' · ')}</p>
          <p><strong>Ejemplo:</strong> {learning.example}</p>
          <p className="muted"><strong>Errores comunes:</strong> {learning.commonErrors.join(' · ')}</p>
        </div>
      )}
    </aside>
  );
}
