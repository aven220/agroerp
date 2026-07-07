import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FormsPlatformNav } from '../components/forms/FormsPlatformNav';
import { LoadingState } from '../components/ux/LoadingState';
import { useToast } from '../context/ToastContext';
import {
  instantiateTemplate,
  listTemplates,
  type FormDefinitionSchema,
} from '../api/forms';
import {
  FORM_STUDIO_TEMPLATES,
  getTemplatesByCategory,
  type FormStudioTemplate,
} from '../form-studio/form-templates-library';
import { FormLifecycleStepper } from '../components/forms/FormLifecycleStepper';

type TemplateItem = {
  id: string;
  source: 'builtin' | 'server';
  templateKey: string;
  name: string;
  description: string;
  category: string;
  schema?: FormDefinitionSchema;
  serverId?: string;
};

export function FormTemplatesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [serverTemplates, setServerTemplates] = useState<TemplateItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const server = await listTemplates().catch(() => []);
      setServerTemplates(
        server.map((t) => ({
          id: `srv-${t.id}`,
          source: 'server' as const,
          templateKey: t.templateKey,
          name: t.name,
          description: t.description ?? '',
          category: 'Guardadas',
          schema: t.schema,
          serverId: t.id,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const builtin: TemplateItem[] = useMemo(
    () =>
      FORM_STUDIO_TEMPLATES.map((t) => ({
        id: `builtin-${t.templateKey}`,
        source: 'builtin' as const,
        templateKey: t.templateKey,
        name: t.name,
        description: t.description,
        category: t.category,
        schema: t.schema,
      })),
    [],
  );

  const all = useMemo(() => [...builtin, ...serverTemplates], [builtin, serverTemplates]);

  const categories = useMemo(() => {
    const set = new Set(all.map((t) => t.category));
    return Array.from(set).sort();
  }, [all]);

  const filtered = useMemo(
    () =>
      all.filter((t) => {
        if (category && t.category !== category) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.templateKey.toLowerCase().includes(q)
        );
      }),
    [all, category, search],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, TemplateItem[]>();
    for (const t of filtered) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [filtered]);

  async function createFromTemplate(t: TemplateItem) {
    const formKey = prompt(
      'Clave del nuevo formulario (no se edita la plantilla):',
      t.templateKey.replace(/^tpl-/, ''),
    );
    if (!formKey?.trim()) return;

    setCreating(t.id);
    try {
      if (t.source === 'server' && t.serverId) {
        const created = await instantiateTemplate(t.serverId, formKey.trim(), t.name);
        toast.success('Formulario creado como borrador desde plantilla guardada.', created.name);
        navigate(`/formularios/${created.id}/disenar`);
        return;
      }
      navigate(`/formularios/nuevo?plantilla=1&tpl=${encodeURIComponent(t.templateKey)}&key=${encodeURIComponent(formKey.trim())}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el formulario');
    } finally {
      setCreating(null);
    }
  }

  return (
    <>
      <Header
        title="Biblioteca de Plantillas"
        subtitle="Las plantillas no se diligencian — solo sirven para crear formularios nuevos"
      />
      <FormsPlatformNav />

      <section className="panel form-lifecycle-intro">
        <FormLifecycleStepper status="draft" compact highlightFrom="template" />
        <p className="muted">
          Elija una plantilla → se creará una <strong>copia editable</strong> en Mis Formularios como borrador.
          La plantilla original nunca cambia.
        </p>
      </section>

      <div className="filter-bar">
        <input
          placeholder="Buscar plantilla…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState variant="card" message="Cargando plantillas…" />
      ) : (
        <div className="form-templates-platform">
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <section key={cat} className="form-template-category panel">
              <h2 className="ds-h4">{cat}</h2>
              <div className="form-studio-template-grid">
                {items.map((t) => (
                  <article key={t.id} className="form-template-card">
                    <span className="form-template-badge">{t.source === 'server' ? 'Guardada' : 'Oficial'}</span>
                    <h3>{t.name}</h3>
                    <p className="muted">{t.description}</p>
                    <p className="ds-caption">
                      {t.schema?.fields?.length ?? 0} campos
                      {t.schema?.sections?.length ? ` · ${t.schema.sections.length} secciones` : ''}
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={creating === t.id}
                      onClick={() => createFromTemplate(t)}
                    >
                      {creating === t.id ? 'Creando…' : 'Crear formulario desde plantilla'}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
