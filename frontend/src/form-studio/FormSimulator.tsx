import { useState } from 'react';
import { FormStudioRenderer } from './FormStudioRenderer';
import { FormStudioPreview, type PreviewDevice } from './FormStudioPreview';
import type { FormFieldDefinition } from '../api/forms';
import { resolvePreviewFields } from './client-conditional';

interface Props {
  fields: FormFieldDefinition[];
  formName: string;
  onClose?: () => void;
}

export function FormSimulator({ fields, formName, onClose }: Props) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [device, setDevice] = useState<PreviewDevice>('phone-portrait');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function validate(): string[] {
    const visible = resolvePreviewFields(fields, data).filter((f) => f.visible);
    const errs: string[] = [];
    for (const f of visible) {
      if (f.effectiveRequired) {
        const v = data[f.key];
        const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
        if (empty) errs.push(`"${f.label}" es obligatorio`);
      }
    }
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (errs.length === 0) {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="panel form-studio-simulator">
        <h3>Simulación completada — {formName}</h3>
        <p className="muted">Los datos no se guardaron (modo prueba).</p>
        <pre className="code-block">{JSON.stringify(data, null, 2)}</pre>
        <div className="row-actions">
          <button type="button" className="btn" onClick={() => { setSubmitted(false); setData({}); setErrors([]); }}>Reiniciar</button>
          {onClose && <button type="button" className="btn btn-primary" onClick={onClose}>Cerrar</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="form-studio-simulator">
      <div className="form-studio-sim-header panel">
        <div>
          <h3>Probar formulario</h3>
          <p className="muted">Diligencie el formulario completo sin publicarlo. Valida campos obligatorios visibles.</p>
        </div>
        <div className="row-actions">
          <button type="button" className="btn" onClick={() => setData({})}>Limpiar</button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>Enviar simulación</button>
        </div>
      </div>
      {errors.length > 0 && (
        <div className="alert alert-danger">
          <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      <FormStudioPreview device={device} onDeviceChange={setDevice}>
        <FormStudioRenderer
          fields={fields}
          data={data}
          onChange={(key, val) => setData((d) => ({ ...d, [key]: val }))}
          onButtonAction={(action) => {
            if (action === 'reset') setData({});
            if (action === 'submit') handleSubmit();
          }}
        />
      </FormStudioPreview>
    </div>
  );
}
