import { Modal } from '../ui/Modal';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutsContext';

export function KeyboardShortcutsModal() {
  const { shortcuts, helpOpen, setHelpOpen } = useKeyboardShortcuts();

  const grouped = shortcuts.reduce<Record<string, typeof shortcuts>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <Modal
      open={helpOpen}
      title="Atajos de teclado"
      onClose={() => setHelpOpen(false)}
      footer={
        <button type="button" className="btn btn-primary" onClick={() => setHelpOpen(false)}>
          Entendido
        </button>
      }
    >
      <p className="ds-shortcuts-intro">Presione <kbd>?</kbd> para abrir esta ayuda en cualquier momento.</p>
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="ds-shortcuts-group">
          <h3 className="ds-shortcuts-category">{category}</h3>
          <ul className="ds-shortcuts-list">
            {items.map((s) => (
              <li key={s.id} className="ds-shortcuts-item">
                <span>{s.label}</span>
                <span className="ds-shortcuts-keys">
                  {s.keys.map((k, i) => (
                    <kbd key={i}>{k}</kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Modal>
  );
}
