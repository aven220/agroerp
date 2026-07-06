import { useState, type ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className="ds-tooltip-wrap">
      {children}
      <span className="ds-tooltip" role="tooltip">{content}</span>
    </span>
  );
}

interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpen?: string;
}

export function Accordion({ items, defaultOpen }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen ?? items[0]?.id ?? '');

  return (
    <div className="ds-accordion">
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id} className="ds-accordion-item">
            <button
              type="button"
              className="ds-accordion-trigger"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? '' : item.id)}
            >
              {item.title}
              <span aria-hidden>{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen ? <div className="ds-accordion-panel">{item.content}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="ds-stepper" aria-label="Progreso">
      {steps.map((label, i) => {
        const status = i < currentStep ? 'completed' : i === currentStep ? 'active' : '';
        return (
          <div key={label} className={`ds-step ${status}`}>
            <span className="ds-step-indicator">{i < currentStep ? '✓' : i + 1}</span>
            <span>{label}</span>
            {i < steps.length - 1 ? <span className="ds-step-line" aria-hidden /> : null}
          </div>
        );
      })}
    </div>
  );
}
