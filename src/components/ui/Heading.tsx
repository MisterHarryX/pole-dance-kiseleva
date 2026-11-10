import { Children, cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import { DecoDivider } from './Art.tsx';

/**
 * Splits a title into words that rise one after another when the heading scrolls in.
 * A gold <em> passes its gradient to each word (background-clip text does not survive transforms).
 */
function splitWords(node: ReactNode, cls: string, counter: { i: number }): ReactNode {
  return Children.map(node, (child) => {
    if (typeof child === 'string') {
      const parts = child.split(/(\s+)/);
      return parts.map((part, k) =>
        /^\s+$/.test(part) || part === '' ? (
          part
        ) : (
          <span className="w" key={k}>
            <span className={cls} style={{ ['--i' as string]: counter.i++ }}>
              {part}
            </span>
          </span>
        ),
      );
    }
    if (isValidElement(child)) {
      const el = child as ReactElement<{ className?: string; children?: ReactNode }>;
      const own = el.props.className ?? '';
      const gold = own.includes('gold-text');
      const inner = splitWords(el.props.children, gold ? 'gold-text' : cls, counter);
      if (el.type === Fragment) return cloneElement(el, undefined, inner);
      return cloneElement(el, { className: own.replace('gold-text', '').trim() || undefined }, inner);
    }
    return child;
  });
}

export function SplitTitle({ children }: { children: ReactNode }) {
  return <>{splitWords(children, '', { i: 0 })}</>;
}

/** Section heading: gold eyebrow with a pole tick, serif title with rising words, optional lead. */
export function Heading({
  eyebrow,
  title,
  lead,
  align = 'left',
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'left' | 'center';
  id?: string;
}) {
  return (
    <header className={`heading heading--${align}`}>
      <p className="eyebrow" data-reveal>
        <span className="eyebrow__tick" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="heading__title" id={id} data-reveal data-reveal-delay="60">
        <SplitTitle>{title}</SplitTitle>
      </h2>
      {align === 'center' && <DecoDivider className="heading__divider" />}
      {lead && (
        <p className="heading__lead" data-reveal data-reveal-delay="200">
          {lead}
        </p>
      )}
    </header>
  );
}
