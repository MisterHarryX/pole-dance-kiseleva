import { contacts, nav } from '../../config/site.ts';
import { adminUrl } from '../../lib/paths.ts';
import { Icon } from '../ui/Icon.tsx';
import { Wordmark } from '../ui/Wordmark.tsx';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <Wordmark large />
          <p>Студия танцев на пилоне в Новогиреево. Танцуем, растягиваемся и становимся сильнее.</p>
        </div>
        <nav className="site-footer__nav" aria-label="Разделы">
          {nav.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="site-footer__contacts">
          <a href={contacts.phoneHref} className="site-footer__phone">
            {contacts.phone}
          </a>
          <p>
            {contacts.city}, {contacts.address}
            <br />
            {contacts.addressNote} · м. {contacts.metro}
          </p>
          <div className="socials">
            {contacts.socials.map((s) => (
              <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                <Icon name={s.id} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="container site-footer__bottom">
        <span>© {new Date().getFullYear()} {contacts.brand}</span>
        <a href="#top">Наверх ↑</a>
      </div>
      <div className="site-footer__key">
        <a href={adminUrl()} aria-label="Вход в кабинет студии" title="Кабинет студии" rel="nofollow">
          <Icon name="key" size={16} />
        </a>
      </div>
    </footer>
  );
}
