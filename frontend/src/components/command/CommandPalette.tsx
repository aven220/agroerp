import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useCommandPalette } from '../../context/CommandProvider';

export function CommandPalette() {
  const { searchOpen, setSearchOpen, addRecentSearch } = useNavigation();
  const {
    mode,
    setMode,
    filteredCommands,
    query,
    setQuery,
    execute,
    toggleFavorite,
    isFavorite,
    favoriteCommandIds,
    commands,
  } = useCommandPalette();

  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen, setQuery]);

  const flatResults = filteredCommands;

  const sections = useMemo(() => {
    const map = new Map<string, typeof flatResults>();
    for (const cmd of flatResults) {
      const list = map.get(cmd.categoryLabel) ?? [];
      list.push(cmd);
      map.set(cmd.categoryLabel, list);
    }
    return map;
  }, [flatResults]);

  const runCommand = (cmd: (typeof flatResults)[number]) => {
    addRecentSearch(cmd.label);
    setSearchOpen(false);
    execute(cmd);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatResults.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && flatResults[activeIdx]) {
      e.preventDefault();
      runCommand(flatResults[activeIdx]);
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      setMode(mode === 'launcher' ? 'commands' : 'launcher');
      setActiveIdx(0);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!searchOpen) return null;

  const placeholder =
    mode === 'commands'
      ? 'Ejecutar comando… (Tab para launcher)'
      : 'Buscar pantallas, entidades, acciones…';

  let flatIdx = 0;

  return (
    <div className="global-search-overlay cmd-palette-overlay" role="presentation" onClick={() => setSearchOpen(false)}>
      <div
        className="global-search-panel cmd-palette-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="global-search-input-wrap cmd-palette-input-wrap">
          <span className="global-search-icon cmd-palette-icon" aria-hidden>⌘</span>
          <input
            ref={inputRef}
            type="search"
            className="global-search-input cmd-palette-input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onKeyDown}
            aria-label="Paleta de comandos"
            autoComplete="off"
          />
          <div className="cmd-palette-mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'launcher'}
              className={`cmd-palette-mode-tab${mode === 'launcher' ? ' active' : ''}`}
              onClick={() => { setMode('launcher'); setActiveIdx(0); }}
            >
              Launcher
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'commands'}
              className={`cmd-palette-mode-tab${mode === 'commands' ? ' active' : ''}`}
              onClick={() => { setMode('commands'); setActiveIdx(0); }}
            >
              Comandos
            </button>
          </div>
          <kbd className="global-search-kbd" aria-hidden>ESC</kbd>
        </div>

        {!query && favoriteCommandIds.length > 0 ? (
          <div className="global-search-section">
            <div className="global-search-section-title">Comandos favoritos</div>
            <div className="global-search-chips">
              {favoriteCommandIds.slice(0, 8).map((id) => {
                const cmd = commands.find((c) => c.id === id);
                if (!cmd) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    className="global-search-chip"
                    onClick={() => runCommand(cmd)}
                  >
                    {cmd.icon} {cmd.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="global-search-results cmd-palette-results" ref={listRef} role="listbox">
          {flatResults.length === 0 ? (
            <p className="global-search-empty">Sin resultados para &quot;{query}&quot;</p>
          ) : (
            Array.from(sections.entries()).map(([category, items]) => (
              <div key={category} className="global-search-group cmd-palette-group">
                <div className="global-search-section-title">{category}</div>
                {items.map((cmd) => {
                  const idx = flatIdx++;
                  const active = idx === activeIdx;
                  return (
                    <div key={cmd.id} className={`cmd-palette-row${active ? ' active' : ''}`} data-cmd-idx={idx}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`global-search-result cmd-palette-result${active ? ' active' : ''}`}
                        onClick={() => runCommand(cmd)}
                        onMouseEnter={() => setActiveIdx(idx)}
                      >
                        <span className="global-search-result-icon">{cmd.icon}</span>
                        <span className="cmd-palette-result-text">
                          <strong>{cmd.label}</strong>
                          {cmd.subtitle ? <small>{cmd.subtitle}</small> : null}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="cmd-palette-fav-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(cmd.id);
                        }}
                        aria-label={isFavorite(cmd.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      >
                        {isFavorite(cmd.id) ? '★' : '☆'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <footer className="cmd-palette-footer">
          <span><kbd>↑↓</kbd> navegar</span>
          <span><kbd>↵</kbd> ejecutar</span>
          <span><kbd>Tab</kbd> cambiar modo</span>
          <span><kbd>⌘K</kbd> launcher</span>
          <span><kbd>⌘⇧P</kbd> comandos</span>
        </footer>
      </div>
    </div>
  );
}
