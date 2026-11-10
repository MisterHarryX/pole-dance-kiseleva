import { useEffect, useState } from 'react';
import { contacts, nav } from '../../config/site.ts';
import { Icon } from '../ui/Icon.tsx';
import { Wordmark } from '../ui/Wordmark.tsx';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the section in view.
  useEffect(() => {
    const ids = nav.map((n) => n.href.slice(1));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="site-header__inner container">
        <a href="#top" className="site-header__logo" onClick={() => setOpen(false)}>
          <Wordmark />
        </a>
        <nav className="site-nav" aria-label="Разделы сайта">
          {nav.map((item) => (
            <a key={item.href} href={item.href} aria-current={active === item.href.slice(1) ? 'true' : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="site-header__actions">
          <a className="site-header__phone" href={contacts.phoneHref}>
            <Icon name="phone" size={16} />
            <span>{contacts.phone}</span>
          </a>
          <a className="btn btn--gold btn--sm" href={contacts.booking} target="_blank" rel="noopener noreferrer">
            <span className="btn__label">Записаться</span>
          </a>
          <button
            type="button"
            className="burger"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <div id="mobile-menu" className="mobile-menu" hidden={!open}>
        <nav aria-label="Меню">
          {nav.map((item, i) => (
            <a key={item.href} href={item.href} style={{ animationDelay: `${80 + i * 50}ms` }} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mobile-menu__foot">
          <a className="btn btn--gold" href={contacts.booking} target="_blank" rel="noopener noreferrer">
            <span className="btn__label">Записаться онлайн</span>
          </a>
          <a className="mobile-menu__phone" href={contacts.phoneHref}>
            {contacts.phone}
          </a>
          <div className="socials">
            {contacts.socials.map((s) => (
              <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                <Icon name={s.id} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
