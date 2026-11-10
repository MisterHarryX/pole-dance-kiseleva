import { useRef, useState } from 'react';
import { api, errorText, shrinkImage } from './api.ts';
import { getAt, setAt, type Field } from './schema.ts';

type Obj = Record<string, unknown>;
type Change = (next: unknown) => void;

export function Fields({ fields, value, onChange }: { fields: Field[]; value: unknown; onChange: Change }) {
  return (
    <div className="a-fields">
      {fields.map((f) => (
        <FieldView key={f.key || f.label} field={f} value={getAt(value, f.key)} onChange={(v) => onChange(setAt(value, f.key, v))} />
      ))}
    </div>
  );
}

function FieldView({ field, value, onChange }: { field: Field; value: unknown; onChange: Change }) {
  switch (field.kind) {
    case 'text':
      return (
        <label className="a-field">
          <span className="a-label">{field.label}</span>
          <input value={typeof value === 'string' ? value : ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
          {field.hint && <small className="a-hint">{field.hint}</small>}
        </label>
      );
    case 'textarea':
      return (
        <label className="a-field">
          <span className="a-label">{field.label}</span>
          <textarea rows={field.rows ?? 3} placeholder={field.placeholder} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
          {field.hint && <small className="a-hint">{field.hint}</small>}
        </label>
      );
    case 'number':
      return (
        <label className="a-field a-field--num">
          <span className="a-label">{field.label}</span>
          <span className="a-num">
            <input
              type="number"
              inputMode="numeric"
              value={value === undefined || value === null ? '' : String(value)}
              onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            />
            {field.suffix && <em>{field.suffix}</em>}
          </span>
          {field.hint && <small className="a-hint">{field.hint}</small>}
        </label>
      );
    case 'toggle':
      return (
        <label className="a-toggle">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span className="a-toggle__track" aria-hidden="true" />
          <span>{field.label}</span>
        </label>
      );
    case 'image':
      return <ImageField field={field} value={value} onChange={onChange} />;
    case 'strings':
      return <StringsField field={field} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
    case 'group':
      return (
        <fieldset className="a-group">
          <legend>{field.label}</legend>
          <Fields fields={field.fields} value={value ?? {}} onChange={onChange} />
        </fieldset>
      );
    case 'list':
      return <ListField field={field} value={Array.isArray(value) ? (value as Obj[]) : []} onChange={onChange} />;
  }
}

function StringsField({ field, value, onChange }: { field: Extract<Field, { kind: 'strings' }>; value: string[]; onChange: Change }) {
  const set = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)));
  return (
    <div className="a-field">
      <span className="a-label">{field.label}</span>
      <div className="a-strings">
        {value.map((v, i) => (
          <div key={i} className="a-strings__row">
            {field.multiline ? <textarea rows={2} value={v} onChange={(e) => set(i, e.target.value)} /> : <input value={v} onChange={(e) => set(i, e.target.value)} />}
            <button type="button" className="a-icon-btn" aria-label="Удалить" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="a-add" onClick={() => onChange([...value, ''])}>
        + {field.add ?? 'Добавить'}
      </button>
    </div>
  );
}

function ListField({ field, value, onChange }: { field: Extract<Field, { kind: 'list' }>; value: Obj[]; onChange: Change }) {
  const [open, setOpen] = useState<number | null>(value.length === 1 ? 0 : null);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen(j);
  };
  return (
    <div className="a-list">
      {field.key !== '' && <span className="a-label">{field.label}</span>}
      {field.hint && <small className="a-hint">{field.hint}</small>}
      {value.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className={`a-item ${isOpen ? 'is-open' : ''}`}>
            <div className="a-item__head">
              <button type="button" className="a-item__toggle" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}>
                <span className="a-item__chev" aria-hidden="true" />
                <span className="a-item__title">{field.title ? field.title(item, i) : `${i + 1}`}</span>
              </button>
              {!field.fixed && (
                <span className="a-item__tools">
                  <button type="button" className="a-icon-btn" aria-label="Выше" onClick={() => move(i, -1)} disabled={i === 0}>
                    ↑
                  </button>
                  <button type="button" className="a-icon-btn" aria-label="Ниже" onClick={() => move(i, 1)} disabled={i === value.length - 1}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className="a-icon-btn a-icon-btn--danger"
                    aria-label="Удалить"
                    onClick={() => {
                      if (confirm('Удалить этот пункт?')) onChange(value.filter((_, j) => j !== i));
                    }}
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            {isOpen && (
              <div className="a-item__body">
                <Fields fields={field.item} value={item} onChange={(v) => onChange(value.map((x, j) => (j === i ? (v as Obj) : x)))} />
              </div>
            )}
          </div>
        );
      })}
      {!field.fixed && (
        <button
          type="button"
          className="a-add"
          onClick={() => {
            onChange([...value, field.blank ? field.blank() : {}]);
            setOpen(value.length);
          }}
        >
          + {field.add ?? 'Добавить'}
        </button>
      )}
    </div>
  );
}

function ImageField({ field, value, onChange }: { field: Extract<Field, { kind: 'image' }>; value: unknown; onChange: Change }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const src = field.shape === 'photo' ? ((value as Obj | undefined)?.src as string | undefined) : (value as string | undefined);

  const upload = async (file: File) => {
    setBusy(true);
    setProblem('');
    try {
      const { blob, w, h } = await shrinkImage(file, field.round ? 600 : 1600);
      const { url } = await api.upload(blob);
      onChange(field.shape === 'photo' ? { ...((value as Obj) ?? {}), src: url, w, h, alt: (value as Obj | undefined)?.alt ?? file.name } : url);
    } catch (e) {
      setProblem(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="a-field">
      <span className="a-label">{field.label}</span>
      <div className="a-image">
        <span className={`a-image__preview ${field.round ? 'is-round' : ''}`}>{src ? <img src={src} alt="" /> : <em>нет фото</em>}</span>
        <span className="a-image__tools">
          <button type="button" className="a-btn a-btn--ghost" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? 'Загружаем…' : src ? 'Заменить фото' : 'Загрузить фото'}
          </button>
          {src && field.shape === 'url' && (
            <button type="button" className="a-link" onClick={() => onChange('')}>
              Убрать
            </button>
          )}
          {field.hint && <small className="a-hint">{field.hint}</small>}
          {problem && <small className="a-error">{problem}</small>}
        </span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
