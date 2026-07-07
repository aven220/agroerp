import { Link } from 'react-router-dom';
import { WidgetShell } from '../components/WidgetShell';
import type { UreFormLink } from '../types';

interface FormsWidgetProps {
  forms: UreFormLink[];
}

export function FormsWidget({ forms }: FormsWidgetProps) {
  return (
    <WidgetShell title="Formularios" id="ure-forms" empty={forms.length === 0}>
      <ul className="ure-form-list">
        {forms.map((form) => (
          <li key={form.id}>
            <div>
              <strong>{form.name ?? form.formKey ?? 'Formulario'}</strong>
              {form.status ? <span className="ure-form-status">{form.status}</span> : null}
            </div>
            {form.formId ? (
              <Link to={`/formularios/${form.formId}`} className="ure-form-link">
                Ver envío
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
