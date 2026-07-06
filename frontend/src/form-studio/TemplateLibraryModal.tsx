import { useMemo, useState } from 'react';
import { FORM_STUDIO_TEMPLATES, getTemplatesByCategory, type FormStudioTemplate } from './form-templates-library';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (template: FormStudioTemplate) => void;
}

export function TemplateLibraryModal({ open, onClose, onSelect }: Props) {
  const [q, setQ] = useState('');
  const byCategory = useMemo(() => getTemplatesByCategory(), []);

  if (!open) return null;

  const filter = (t: FormStudioTemplate) =>
    !q ||
    t.name.toLowerCase().includes(q.toLowerCase()) ||
    t.tags.some((tag) => tag.includes(q.toLowerCase()));

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-panel form-studio-template-modal">
        <header className="modal-header">
          <h2>Biblioteca de plantillas</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>Cerrar</button>
        </header>
        <input
          placeholder="Buscar plantilla..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="form-studio-template-grid">
          {Array.from(byCategory.entries()).map(([cat, templates]) => {
            const items = templates.filter(filter);
            if (!items.length) return null;
            return (
              <section key={cat}>
                <h3>{cat}</h3>
                <div className="template-cards">
                  {items.map((t) => (
                    <button
                      key={t.templateKey}
                      type="button"
                      className="template-card"
                      onClick={() => { onSelect(t); onClose(); }}
                    >
                      <strong>{t.name}</strong>
                      <span className="muted">{t.description}</span>
                      <span className="template-tags">{t.tags.join(' · ')}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
