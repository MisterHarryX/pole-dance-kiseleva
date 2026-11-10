import { useState, type CSSProperties } from 'react';
import { care, contacts, founder, promos, ratio, team } from '../../config/site.ts';
import { spotlight, tiltLeave, tiltMove } from '../../hooks/useTilt.ts';
import { DecoArch, DecoCorners, DirectionArt, Draw } from '../ui/Art.tsx';
import { Heading } from '../ui/Heading.tsx';
import { Icon } from '../ui/Icon.tsx';
import { useLightbox } from '../ui/Lightbox.tsx';

/** Offers: the poster (shown whole, in its own proportions) turns over to the conditions. */
export function Promos() {
  const [flipped, setFlipped] = useState<string | null>(null);
  // Column widths follow the posters' proportions, so both stand at the same height uncropped.
  const columns = promos.map((pr) => `minmax(0, ${pr.photo.w / pr.photo.h}fr)`).join(' ');
  return (
    <section className="section s-dark promos" id="promos" aria-labelledby="promos-title">
      <div className="container">
        <Heading
          eyebrow="Акции"
          title={
            <>
              Начать <em className="gold-text">проще</em>, чем кажется
            </>
          }
          lead="Наведите на афишу или нажмите на неё, чтобы прочитать условия."
          align="center"
          id="promos-title"
        />
        <div className="promos__grid" style={{ gridTemplateColumns: columns }}>
          {promos.map((pr, i) => (
            <div key={pr.id} className="promo" data-reveal data-reveal-delay={i * 120}>
              <button
                type="button"
                className={`promo__card ${flipped === pr.id ? 'is-flipped' : ''}`}
                style={{ aspectRatio: ratio(pr.photo) }}
                aria-pressed={flipped === pr.id}
                aria-label={`${pr.title}: показать условия`}
                onClick={() => setFlipped((f) => (f === pr.id ? null : pr.id))}
              >
                <span className="promo__face promo__face--front">
                  <img src={pr.photo.src} alt={pr.photo.alt} loading="lazy" />
                </span>
                <span className="promo__face promo__face--back">
                  <DecoCorners />
                  <DirectionArt id={pr.id === 'trial' ? 'exotic' : 'personal'} className="promo__art" />
                  <span className="promo__num">0{i + 1}</span>
                  <span className="promo__title">{pr.title}</span>
                  <span className="promo__text">{pr.text}</span>
                </span>
              </button>
              <a className="btn btn--ghost btn--sm" href={contacts.booking} target="_blank" rel="noopener noreferrer">
                <span className="btn__label">{pr.cta}</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);

export function Team() {
  const openLightbox = useLightbox();
  const [first, last] = founder.name.split(' ');
  // Евгения показана крупно выше; в сетке — остальные тренеры (ровно 4 × 2).
  const coaches = team.filter((m) => m.name !== founder.name);

  return (
    <section className="section s-light team" id="team" aria-labelledby="team-title">
      <div className="container">
        <div className="founder">
          <div className="founder__visual" data-reveal>
            <DecoArch className="founder__arch" />
            <button
              type="button"
              className="founder__photo"
              style={{ aspectRatio: ratio(founder.photo) }}
              onClick={() => openLightbox([founder.photo], 0)}
              aria-label="Открыть фото"
            >
              <img src={founder.photo.src} alt={founder.photo.alt} loading="lazy" />
            </button>
          </div>
          <div className="founder__copy">
            <Heading
              eyebrow="Основательница"
              title={
                <>
                  {first} <em className="gold-text">{last}</em>
                </>
              }
              id="team-title"
            />
            <p className="founder__role" data-reveal>
              {founder.role}
            </p>
            {founder.text.map((t, i) => (
              <p key={i} className="founder__text" data-reveal data-reveal-delay={100 + i * 80}>
                {t}
              </p>
            ))}
            <blockquote className="founder__quote" data-reveal data-reveal-delay="260">
              <p>«{founder.quote}»</p>
              <cite>— {founder.quoteAuthor}</cite>
            </blockquote>
            <a className="btn btn--dark" href={contacts.bookingMaster} target="_blank" rel="noopener noreferrer" data-reveal data-reveal-delay="320">
              <span className="btn__label">Записаться к Евгении</span>
            </a>
          </div>
        </div>

        <div className="team__head">
          <Heading
            eyebrow="Команда"
            title={
              <>
                Тренеры <em className="gold-text">студии</em>
              </>
            }
            lead="Вместе с Евгенией группы и индивидуальные занятия ведут восемь тренеров. Нажмите на карточку, чтобы выбрать тренера и время в онлайн-записи."
            align="center"
          />
        </div>
        <ul className="team__grid">
          {coaches.map((m, i) => (
            <li key={m.name} data-reveal data-reveal-delay={(i % 4) * 90}>
              <a
                className="member"
                href={contacts.bookingMaster}
                target="_blank"
                rel="noopener noreferrer"
                onPointerMove={(e) => {
                  tiltMove(e, 7);
                  spotlight(e);
                }}
                onPointerLeave={tiltLeave}
              >
                <span className="member__avatar" style={{ ['--d' as string]: `${i * -2.7}s` } as CSSProperties}>
                  <svg className="member__ring" viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="47" fill="none" stroke="url(#g-gold)" strokeWidth="1.6" strokeDasharray="6 4" />
                  </svg>
                  {m.photo ? (
                    <img src={m.photo} alt="" loading="lazy" />
                  ) : (
                    <span className="member__mono" aria-hidden="true">
                      {initials(m.name)}
                    </span>
                  )}
                </span>
                <span className="member__name">{m.name}</span>
                <span className="member__role">{m.role}</span>
                <svg className="member__orn" viewBox="0 0 120 12" aria-hidden="true">
                  <path d="M0 6H48M72 6H120M60 1L65 6L60 11L55 6Z" fill="none" stroke="url(#g-gold)" strokeWidth="1" />
                </svg>
                <span className="member__cta">
                  Записаться <Icon name="arrow" size={14} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Care() {
  const [tab, setTab] = useState(care.tabs[0].id);
  const current = care.tabs.find((t) => t.id === tab)!;
  return (
    <section className="section s-dark care" id="care" aria-labelledby="care-title">
      <div className="container care__grid">
        <div className="care__intro">
          <Heading eyebrow="Восстановление" title={care.title} lead={care.lead} id="care-title" />
          <div className="care__tabs" role="tablist" aria-label="Услуги" data-reveal>
            {care.tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === tab}
                aria-controls="care-panel"
                id={`care-tab-${t.id}`}
                onClick={() => setTab(t.id)}
              >
                {t.title}
              </button>
            ))}
          </div>
          <a className="btn btn--gold" href={contacts.bookingPersonal} target="_blank" rel="noopener noreferrer" data-reveal>
            <span className="btn__label">Записаться на процедуру</span>
          </a>
          <Draw className="care__art" viewBox="0 0 200 120" width={1.6}>
            {/* камни для стоун-массажа и веточка */}
            <ellipse pathLength={1} cx="70" cy="96" rx="44" ry="14" />
            <ellipse pathLength={1} cx="78" cy="72" rx="32" ry="11" />
            <ellipse pathLength={1} cx="84" cy="52" rx="22" ry="8" />
            <path pathLength={1} d="M140 108C140 80 150 50 176 24" />
            <path pathLength={1} d="M148 80C136 72 132 60 136 50C148 56 152 68 148 80ZM158 58C150 48 150 36 158 28C166 36 166 48 158 58ZM164 74C176 66 186 66 194 72C186 82 174 82 164 74Z" />
          </Draw>
        </div>
        <div className="care__panel" id="care-panel" role="tabpanel" aria-labelledby={`care-tab-${tab}`} key={tab}>
          <ul className="care__list">
            {current.items.map((it, i) => (
              <li key={it.name} style={{ animationDelay: `${i * 55}ms` }} onPointerMove={spotlight}>
                <span className="care__name">{it.name}</span>
                <span className="care__time">{it.time}</span>
                <strong className="care__price">{it.price}</strong>
              </li>
            ))}
          </ul>
          <p className="care__note">
            <Icon name="sparkle" size={14} /> {current.note}
          </p>
        </div>
      </div>
    </section>
  );
}
