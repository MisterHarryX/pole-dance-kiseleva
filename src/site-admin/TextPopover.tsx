import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { areaOf } from '../lib/liveLayer.ts';
import { captureText, previewText, restoreText, type CapturedText } from './dom.ts';

export interface TextTarget {
  /** Where the text is saved: config paths, or a free text key. */
  paths: string[];
  /** Line of a multi-line text, when the page shows it line by line. */
  line?: number;
  /** "Вопросы", "Первый экран"… */
  title: string;
  /** "Ответ", "текст на странице", "в 2 местах"… */
  detail: string;
  /** What the editor starts with. */
  value: string;
  /** Text as written in the code. */
  original: string;
  /** Text as the page shows it right now, to find every node to preview in. */
  shown: string;
  /** Free texts preview only inside their own area of the page. */
  area?: string;
  rect: DOMRect;
}

const WIDTH = 420;

/**
 * Inline editor anchored to the clicked text (from ISPANA). Typing previews on the page at
 * once; «Применить» keeps it as a draft until «Опубликовать».
 */
export function TextPopover({ target, onApply, onClose }: { target: TextTarget; onApply: (target: TextTarget, value: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(target.value);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const [position, setPosition] = useState({ top: target.rect.bottom + 10, left: target.rect.left });
  const titleId = useId();
  const nodes = useRef<CapturedText>([]);

  useEffect(() => {
    const area = target.area;
    nodes.current = captureText(target.shown, area ? (node) => areaOf(node.parentElement) === area : undefined);
    const element = field.current;
    element?.focus();
    element?.setSelectionRange(element.value.length, element.value.length);
  }, [target.shown, target.area]);

  // Below the text, or above it when there is no room; always inside the viewport.
  useLayoutEffect(() => {
    const height = box.current?.offsetHeight ?? 220;
    const below = target.rect.bottom + 12;
    const top = below + height > window.innerHeight - 96 ? Math.max(12, target.rect.top - height - 12) : below;
    const left = Math.min(Math.max(12, target.rect.left), window.innerWidth - Math.min(WIDTH, window.innerWidth - 24) - 12);
    setPosition({ top, left });
  }, [target.rect]);

  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = 'auto';
    const border = element.offsetHeight - element.clientHeight;
    element.style.height = `${Math.min(element.scrollHeight + border, 280)}px`;
  }, [value]);

  const preview = (next: string) => {
    setValue(next);
    previewText(nodes.current, next.trim() ? next : target.value);
  };
  const cancel = () => {
    restoreText(nodes.current);
    onClose();
  };
  const apply = () => {
    onApply(target, value.trim() ? value.trim() : target.value);
    onClose();
  };
  const changedFromCode = value.trim() !== target.original.trim();

  return (
    <div
      ref={box}
      data-site-admin
      role="dialog"
      aria-labelledby={titleId}
      className="sa-pop"
      style={{ top: position.top, left: position.left, width: `min(${WIDTH}px, calc(100vw - 24px))` }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          cancel();
        }
      }}
    >
      <div className="sa-pop__head">
        <p id={titleId}>
          <span>{target.title}</span> · {target.detail}
        </p>
        <kbd>Enter — применить</kbd>
      </div>
      <div className="sa-pop__body">
        <textarea
          ref={field}
          value={value}
          rows={1}
          onChange={(event) => preview(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              apply();
            }
          }}
          aria-label="Новый текст"
          className="sa-input"
        />
        {changedFromCode && (
          <p className="sa-note">
            Исходный текст: <span>{target.original}</span>
          </p>
        )}
        <div className="sa-pop__actions">
          {changedFromCode && (
            <button type="button" className="sa-btn sa-btn--quiet" onClick={() => preview(target.original)}>
              Вернуть исходный
            </button>
          )}
          <span className="sa-spacer" />
          <button type="button" className="sa-btn sa-btn--quiet" onClick={cancel}>
            Отмена
          </button>
          <button type="button" className="sa-btn sa-btn--gold" onClick={apply}>
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}

/** Prices are counted by the calculator, so they open in the cabinet's «Цены» form. */
export function NotePopover({ rect, title, text, href, action, onClose }: { rect: DOMRect; title: string; text: string; href: string; action: string; onClose: () => void }) {
  const width = 320;
  const top = rect.bottom + 230 > window.innerHeight ? Math.max(12, rect.top - 190) : rect.bottom + 12;
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
  return (
    <div data-site-admin role="dialog" aria-label={title} className="sa-pop" style={{ top, left, width }} onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onClose();
      }}>
      <div className="sa-pop__head">
        <p>
          <span>{title}</span>
        </p>
      </div>
      <div className="sa-pop__body">
        <p className="sa-note sa-note--lead">{text}</p>
        <div className="sa-pop__actions">
          <span className="sa-spacer" />
          <button type="button" className="sa-btn sa-btn--quiet" onClick={onClose}>
            Закрыть
          </button>
          <a className="sa-btn sa-btn--gold" href={href} autoFocus>
            {action}
          </a>
        </div>
      </div>
    </div>
  );
}
