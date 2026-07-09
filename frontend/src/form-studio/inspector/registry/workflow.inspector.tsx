import {
  WORKFLOW_ACTION_LABELS,
  WORKFLOW_ACTIONS,
  type FormWorkflowDefinition,
} from '../../workflow/workflow.types';
import {
  addWorkflowState,
  addWorkflowTransition,
  removeWorkflowState,
  removeWorkflowTransition,
  updateWorkflowState,
  updateWorkflowTransition,
} from '../../workflow/workflow.utils';
import { inspectorRegistry } from '../InspectorRegistry';
import type { InspectorTypeDefinition } from '../types';

export interface WorkflowInspectorContext {
  value: FormWorkflowDefinition;
  disabled?: boolean;
  onChange: (next: FormWorkflowDefinition) => void;
}

function patch(context: WorkflowInspectorContext, next: FormWorkflowDefinition) {
  context.onChange(next);
}

const WORKFLOW_INSPECTOR: InspectorTypeDefinition<WorkflowInspectorContext> = {
  type: 'WORKFLOW',
  title: () => 'Aprobaciones',
  subtitle: () => 'Flujo de revisión al enviar el formulario',
  groups: [
    { id: 'general', title: 'General', priority: 1 },
    { id: 'data', title: 'Estados', priority: 2 },
    { id: 'erp', title: 'Transiciones', priority: 3 },
    { id: 'advanced', title: 'Avanzado', priority: 4, collapsed: true },
  ],
  properties: [
    {
      id: 'workflow.enabled',
      label: 'Activar workflow',
      groupId: 'general',
      priority: 1,
      presentation: 'raw',
      render: (context) => (
        <label className="form-check">
          <input
            type="checkbox"
            disabled={context.disabled}
            checked={context.value.enabled}
            onChange={(event) => patch(context, { ...context.value, enabled: event.target.checked })}
          />
          Habilitar workflow del formulario
        </label>
      ),
    },
    {
      id: 'workflow.states',
      label: 'Estados',
      groupId: 'data',
      priority: 1,
      presentation: 'raw',
      visible: (context) => context.value.enabled,
      render: (context) => (
        <div className="workflow-editor-states">
          <div className="capture-config-header">
            <p className="muted">Estados del ciclo de vida del formulario.</p>
            <button
              type="button"
              className="btn btn-sm"
              disabled={context.disabled}
              onClick={() => patch(context, addWorkflowState(context.value))}
            >
              + Estado
            </button>
          </div>
          {context.value.states.length === 0 ? (
            <p className="muted">Sin estados. Agregue al menos uno (ej. Enviado, Revisión, Aprobado).</p>
          ) : (
            <div className="workflow-state-list">
              {context.value.states.map((state) => (
                <div key={state.id} className="workflow-state-row">
                  <label>
                    Nombre
                    <input
                      value={state.name}
                      disabled={context.disabled}
                      onChange={(event) =>
                        patch(
                          context,
                          updateWorkflowState(context.value, state.id, { name: event.target.value }),
                        )
                      }
                    />
                  </label>
                  <label>
                    ID
                    <input value={state.id} readOnly aria-readonly className="muted-input" />
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    disabled={context.disabled}
                    onClick={() => patch(context, removeWorkflowState(context.value, state.id))}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'workflow.transitions',
      label: 'Transiciones',
      groupId: 'erp',
      priority: 1,
      presentation: 'raw',
      visible: (context) => context.value.enabled && context.value.states.length > 0,
      render: (context) => (
        <div className="workflow-editor-transitions">
          <div className="capture-config-header">
            <p className="muted">Define acciones entre estados.</p>
            <button
              type="button"
              className="btn btn-sm"
              disabled={context.disabled || context.value.states.length < 1}
              onClick={() => patch(context, addWorkflowTransition(context.value))}
            >
              + Transición
            </button>
          </div>
          {context.value.transitions.length === 0 ? (
            <p className="muted">Sin transiciones configuradas.</p>
          ) : (
            <div className="workflow-transition-list">
              {context.value.transitions.map((transition, index) => (
                <div key={`${transition.from}-${transition.to}-${index}`} className="workflow-transition-row">
                  <label>
                    Origen
                    <select
                      value={transition.from}
                      disabled={context.disabled}
                      onChange={(event) =>
                        patch(
                          context,
                          updateWorkflowTransition(context.value, index, { from: event.target.value }),
                        )
                      }
                    >
                      <option value="">— Estado —</option>
                      {context.value.states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Destino
                    <select
                      value={transition.to}
                      disabled={context.disabled}
                      onChange={(event) =>
                        patch(
                          context,
                          updateWorkflowTransition(context.value, index, { to: event.target.value }),
                        )
                      }
                    >
                      <option value="">— Estado —</option>
                      {context.value.states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Acción
                    <select
                      value={transition.action}
                      disabled={context.disabled}
                      onChange={(event) =>
                        patch(
                          context,
                          updateWorkflowTransition(context.value, index, { action: event.target.value }),
                        )
                      }
                    >
                      {WORKFLOW_ACTIONS.map((action) => (
                        <option key={action} value={action}>
                          {WORKFLOW_ACTION_LABELS[action]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    disabled={context.disabled}
                    onClick={() => patch(context, removeWorkflowTransition(context.value, index))}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'workflow.json',
      label: 'Vista JSON',
      groupId: 'advanced',
      priority: 1,
      presentation: 'raw',
      visible: (context) => context.value.enabled,
      render: (context) => (
        <pre className="code-block workflow-json-preview">
          {JSON.stringify(context.value, null, 2)}
        </pre>
      ),
    },
  ],
};

export function registerWorkflowInspector(): void {
  inspectorRegistry.register(WORKFLOW_INSPECTOR);
}
