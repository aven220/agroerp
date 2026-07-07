import type { FormFieldDefinition } from '../../api/forms';

export type FormLayoutNodeType =
  | 'section'
  | 'accordion'
  | 'tabs'
  | 'tab'
  | 'repeat_group'
  | 'matrix'
  | 'field';

export type FormLayoutChild = string | FormLayoutNode;

export interface FormLayoutNodeBase {
  key: string;
  title?: string;
  description?: string;
}

export interface FormLayoutSectionNode extends FormLayoutNodeBase {
  type: 'section' | 'accordion';
  children: FormLayoutChild[];
}

export interface FormLayoutTabNode extends FormLayoutNodeBase {
  type: 'tab';
  children: FormLayoutChild[];
}

export interface FormLayoutTabsNode extends FormLayoutNodeBase {
  type: 'tabs';
  children: FormLayoutTabNode[];
}

export interface FormLayoutRepeatGroupNode extends FormLayoutNodeBase {
  type: 'repeat_group';
  min?: number;
  max?: number;
  children?: FormLayoutChild[];
}

export type FormMatrixResponseType = 'select' | 'radio' | 'number' | 'text' | 'checkbox';

export interface FormLayoutMatrixNode extends FormLayoutNodeBase {
  type: 'matrix';
  rows: string[];
  columns: Array<{ value: string; label: string }>;
  responseType?: FormMatrixResponseType;
}

export interface FormLayoutFieldNode extends FormLayoutNodeBase {
  type: 'field';
}

export type FormLayoutNode =
  | FormLayoutSectionNode
  | FormLayoutTabsNode
  | FormLayoutTabNode
  | FormLayoutRepeatGroupNode
  | FormLayoutMatrixNode
  | FormLayoutFieldNode;

export type LayoutSelection =
  | { kind: 'root'; index: number }
  | { kind: 'tab'; tabsIndex: number; tabIndex: number };

export type RepeatGroupField = FormFieldDefinition & {
  type: 'repeat_group' | 'subform';
  fields?: FormFieldDefinition[];
};

export type MatrixField = FormFieldDefinition & {
  type: 'matrix';
  matrix?: { rows: string[]; columns: string[] };
};
