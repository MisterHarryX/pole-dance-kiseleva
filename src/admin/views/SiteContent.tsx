import { useEffect, useState } from 'react';
import type { ContentKey, ContentOverrides } from '../../../shared/content.ts';
import { mergeValue, targets } from '../../lib/content.ts';
import { Fields } from '../Form.tsx';
import { AdminIcon } from '../icons.tsx';
import { pick, sections } from '../schema.ts';
import { useAdmin } from '../store.tsx';

/** Pristine defaults from site.ts (the panel never applies overrides to them). */
const defaults = Object.fromEntries(Object.entries(targets).map(([k, v]) => [k, structuredClone(v)])) as Record<ContentKey, unknown>;

const current = (key: ContentKey, overrides: ContentOverrides) =>
  overrides[key] === undefined ? structuredClone(defaults[key]) : mergeValue(structuredClone(defaults[key]), overrides[key]);

const LAST = 'pdk-site-section';
const readLast = (): ContentKey => {
  try {
    const key = sessionStorage.getItem(LAST);
    if (key && sections.some((s) => s.key === key)) return key as ContentKey;
  } catch {
    // Private mode: start from the first section.
  }
  return sections[0].key;
};

/**
 * «Разделы сайта»: forms for the texts, prices and photos of each section (the studio's
 * addition to the ISPANA panel). Drafts live in the store, so switching views keeps them.
 */
export function SiteContent() {
  const { overrides, saveOverrides, drafts, setDrafts, toast } = useAdmin();
  const [key, setKey] = useState<ContentKey>(readLast);
  const [saving, setSaving] = useState(false);
  const section = sections.find((s) => s.key === key) ?? sections[0];
  const value = drafts[section.key] ?? current(section.key, overrides);
  const dirty = Object.keys(drafts) as ContentKey[];

  useEffect(() => {
    try {
      sessionStorage.setItem(LAST, key);
    } catch {
      // Not remembered in private mode.
    }
  }, [key]);

  const base = (): ContentOverrides => {
    const next = { ...overrides };
    delete next.updatedAt;
    return next;
  };

  const save = async () => {
    setSaving(true);
    const next = base();
    for (const k of dirty) next[k] = pick(drafts[k], sections.find((s) => s.key === k)!.fields);
    const ok = await saveOverrides(next);
    setSaving(false);
    if (ok) {
      setDrafts(() => ({}));
      toast('Сохранено. Изменения уже на сайте.');
    }
  };

  const reset = async () => {
    if (!confirm('Вернуть этот раздел к исходному тексту? Ваши правки в нём будут удалены.')) return;
    const next = base();
    delete next[section.key];
    if (await saveOverrides(next)) {
      setDrafts((d) => {
        const copy = { ...d };
        delete copy[section.key];
        return copy;
      });
      toast('Раздел возвращён к исходному.');
    }
  };

  return (
    <div className="a-site">
      <div className="a-toolbar">
        <div className="a-segment a-segment--wrap" role="tablist" aria-label="Раздел сайта">
          {sections.map((s) => (
            <button key={s.key} type="button" role="tab" aria-selected={s.key === section.key} aria-pressed={s.key === section.key} onClick={() => setKey(s.key)}>
              {s.title}
              {drafts[s.key] !== undefined ? (
                <span className="a-site__mark" data-kind="draft" title="Есть несохранённые изменения" />
              ) : overrides[s.key] !== undefined ? (
                <span className="a-site__mark" title="Изменено в кабинете" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <section className="a-panel a-site__panel" key={section.key}>
        <header className="a-site__head">
          <div>
            <h2 className="a-site__title">{section.title}</h2>
            <p className="a-meta">{section.description}</p>
          </div>
          {overrides[section.key] !== undefined && (
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={reset}>
              Вернуть исходный текст
            </button>
          )}
        </header>
        <Fields fields={section.fields} value={value} onChange={(v) => setDrafts((d) => ({ ...d, [section.key]: v }))} />
      </section>

      {dirty.length > 0 && (
        <div className="a-savebar" role="region" aria-label="Несохранённые изменения">
          <span>Изменено: {dirty.map((k) => sections.find((s) => s.key === k)?.title).join(', ')}</span>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setDrafts(() => ({}))} disabled={saving}>
            Отменить
          </button>
          <button type="button" className="a-btn a-btn--primary a-btn--sm" onClick={save} disabled={saving}>
            <AdminIcon name="check" size={15} /> {saving ? 'Сохраняю…' : 'Сохранить на сайте'}
          </button>
        </div>
      )}
    </div>
  );
}
