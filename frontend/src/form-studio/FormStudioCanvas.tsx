import { memo } from 'react';
import type { FormFieldDefinition } from '../api/forms';
import { labelFieldType } from './studio-labels';

export interface FormStudioCanvasProps {
  isNew: boolean;
  formKey: string;
  name: string;
  description: string;
  fields: FormFieldDefinition[];
  selectedIdx: number | null;
  formSelected: boolean;
  onFormKeyChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSelectForm: () => void;
  onSelectField: (idx: number) => void;
  onMoveField: (idx: number, dir: -1 | 1) => void;
  onRemoveField: (idx: number) => void;
}

const FieldCard = memo(function FieldCard({
  field,
  selected,
  onSelect,
  onMove,
  onRemove,
}: {
  field: FormFieldDefinition;
  selected: boolean;
  onSelect: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <article
      className={`fs-canvas-field${selected ? ' selected' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-selected={selected}
      aria-label={`Campo ${field.label}`}
    >
      <div className="fs-field-grip" aria-hidden title="Arrastre para reordenar (próximamente)">⠿</div>
      <div className="fs-field-body">
        <strong className="fs-field-label">{field.label}</strong>
        <span className="fs-field-type">{labelFieldType(field.type)}</span>
        {field.required ? <span className="fs-field-badge required">Obligatorio</span> : null}
        {field.visibleWhen ? <span className="fs-field-badge conditional">Condicional</span> : null}
      </div>
      <div className="fs-field-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="fs-field-action" onClick={() => onMove(-1)} aria-label="Mover arriba">↑</button>
        <button type="button" className="fs-field-action" onClick={() => onMove(1)} aria-label="Mover abajo">↓</button>
        <button type="button" className="fs-field-action danger" onClick={onRemove} aria-label="Eliminar campo">×</button>
      </div>
    </article>
  );
});

export function FormStudioCanvas({
  isNew,
  formKey,
  name,
  description,
  fields,
  selectedIdx,
  formSelected,
  onFormKeyChange,
  onNameChange,
  onDescriptionChange,
  onSelectForm,
  onSelectField,
  onMoveField,
  onRemoveField,
}: FormStudioCanvasProps) {
  return (
    <section className="fs-canvas" aria-label="Lienzo del formulario">
      <div className="fs-canvas-header">
        <h2 className="fs-canvas-title">Lienzo</h2>
        <span className="fs-canvas-count muted">{fields.length} campo{fields.length === 1 ? '' : 's'}</span>
      </div>

      {isNew ? (
        <div className="fs-canvas-card fs-canvas-meta">
          <h3 className="fs-card-title">Información general</h3>
          <div className="fs-meta-grid">
            <label className="fs-meta-field">
              <span>Identificador interno</span>
              <input
                placeholder="ej. registro_productor"
                value={formKey}
                onChange={(e) => onFormKeyChange(e.target.value)}
                aria-describedby="fs-meta-key-hint"
              />
              <small id="fs-meta-key-hint" className="muted">Solo letras minúsculas y guiones bajos</small>
            </label>
            <label className="fs-meta-field">
              <span>Nombre visible</span>
              <input
                placeholder="Nombre del formulario"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </label>
          </div>
        </div>
      ) : null}

      <label className="fs-canvas-card fs-canvas-desc">
        <span className="fs-card-title">Descripción</span>
        <textarea
          placeholder="Describa el propósito de este formulario para su equipo"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={2}
        />
      </label>

      <article
        className={`fs-canvas-card fs-canvas-form-target${formSelected ? ' selected' : ''}`}
        onClick={onSelectForm}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectForm();
          }
        }}
        role="button"
        tabIndex={0}
        aria-selected={formSelected}
      >
        <div className="fs-form-target-icon" aria-hidden>⚙️</div>
        <div>
          <h3 className="fs-card-title">{name || formKey || 'Configuración del formulario'}</h3>
          <p className="muted fs-form-target-hint">
            Captura en campo · Destino de datos · Aprobaciones · Sin conexión · Ubicación
          </p>
        </div>
        <span className="fs-form-target-arrow" aria-hidden>→</span>
      </article>

      <div className="fs-canvas-fields">
        {fields.length === 0 ? (
          <div className="fs-canvas-empty">
            <div className="fs-empty-icon" aria-hidden>📋</div>
            <p><strong>Sin campos aún</strong></p>
            <p className="muted">Seleccione un componente en la biblioteca izquierda para comenzar.</p>
            <div className="fs-drop-zone" aria-hidden>
              <span>Suelte aquí para agregar</span>
            </div>
          </div>
        ) : (
          fields.map((f, idx) => (
            <FieldCard
              key={`${f.key}-${idx}`}
              field={f}
              selected={!formSelected && selectedIdx === idx}
              onSelect={() => onSelectField(idx)}
              onMove={(dir) => onMoveField(idx, dir)}
              onRemove={() => onRemoveField(idx)}
            />
          ))
        )}
        {fields.length > 0 ? (
          <div className="fs-drop-zone fs-drop-zone-inline" aria-hidden>
            <span>+ Agregar campo desde la biblioteca</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
