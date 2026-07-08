export { InspectorPanel } from './InspectorPanel';
export { InspectorHeader, InspectorHeaderSlot } from './InspectorHeader';
export { InspectorFooter } from './InspectorFooter';
export { InspectorTabs } from './InspectorTabs';
export { InspectorSection } from './InspectorSection';
export { InspectorProperty } from './InspectorProperty';
export { InspectorProvider, useInspectorContext } from './InspectorContext';
export { InspectorRegistry, inspectorRegistry } from './InspectorRegistry';

export {
  registerDefaultInspectors,
  registerFieldInspector,
  registerSectionInspector,
  registerLayoutInspector,
  registerFormInspector,
  registerCaptureInspector,
  registerErpMappingInspector,
  registerWorkflowInspector,
} from './registry';

export type {
  InspectorTargetType,
  InspectorGroupId,
  InspectorGroupDefinition,
  InspectorPropertyDefinition,
  InspectorTypeDefinition,
  InspectorSelection,
  ResolvedInspectorView,
} from './types';

export type { FieldInspectorContext } from './registry/field.inspector';
export type { CaptureInspectorContext } from './registry/capture.inspector';
export type { ErpMappingInspectorContext } from './registry/erp-mapping.inspector';
export type { WorkflowInspectorContext } from './registry/workflow.inspector';
export type { FormWorkflowDefinition } from '../workflow/workflow.types';

import { registerDefaultInspectors } from './registry';
import './inspector.css';

registerDefaultInspectors();
