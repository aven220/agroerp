import { registerCaptureInspector } from './capture.inspector';
import { registerErpMappingInspector } from './erp-mapping.inspector';
import { registerFieldInspector } from './field.inspector';
import { registerFormInspector } from './form.inspector';
import { registerLayoutInspector } from './layout.inspector';
import { registerSectionInspector } from './section.inspector';
import { registerWorkflowInspector } from './workflow.inspector';

let registered = false;

export function registerDefaultInspectors(): void {
  if (registered) return;
  registerFieldInspector();
  registerSectionInspector();
  registerLayoutInspector();
  registerFormInspector();
  registerCaptureInspector();
  registerErpMappingInspector();
  registerWorkflowInspector();
  registered = true;
}

export { registerFieldInspector } from './field.inspector';
export { registerSectionInspector } from './section.inspector';
export { registerLayoutInspector } from './layout.inspector';
export { registerFormInspector } from './form.inspector';
export { registerCaptureInspector } from './capture.inspector';
export { registerErpMappingInspector } from './erp-mapping.inspector';
export { registerWorkflowInspector } from './workflow.inspector';

export type { FieldInspectorContext } from './field.inspector';
export type { SectionInspectorContext } from './section.inspector';
export type { LayoutInspectorContext } from './layout.inspector';
export type { FormInspectorContext } from './form.inspector';
export type { CaptureInspectorContext } from './capture.inspector';
export type { ErpMappingInspectorContext } from './erp-mapping.inspector';
export type { WorkflowInspectorContext } from './workflow.inspector';
