import { useInspectorContext } from './InspectorContext';

export function InspectorFooter() {
  const { view } = useInspectorContext();

  if (!view?.footer) return null;

  return <footer className="inspector-footer">{view.footer}</footer>;
}
