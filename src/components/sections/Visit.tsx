import { useEffect, useRef, useState } from 'react';
import { contacts, faq, reviews, steps } from '../../config/site.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { Draw, StepArt } from '../ui/Art.tsx';
import { Heading } from '../ui/Heading.tsx';
import { Icon } from '../ui/Icon.tsx';

/** First visit: a gold line draws down the steps as you scroll. */
export function FirstVisit() {
  const list = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    if (reduced) {
      el.style.setProperty('--draw', '1');
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const t = Math.min(1, Math.max(0, (vh * 0.7 - r.top) / r.height));
      el.style.setProperty('--draw', t.toFixed(3));
      el.querySelectorAll<HTMLElement>('.step').forEach((li, i, all) => {
        li.classList.toggle('is-lit', t >= (i + 0.35) / all.length);
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <section className="section s-light visit" id="visit" aria-labelledby="visit-title">
      <div className="container visit__grid">
        <div className="visit__aside">
          <Heading
            eyebrow="Первое занятие"
            title={
              <>
                Как всё <em className="gold-text">пройдёт</em>
              </>
            }
            lead="Пять простых шагов от записи до первого вращения. Волноваться не нужно: тренер рядом на каждом этапе."
            id="visit-title"
          />
          <a className="btn btn--dark" href={contacts.booking} target="_blank" rel="noopener noreferrer" data-reveal>
            <span className="btn__label">Выбрать время</span>
          </a>
        </div>
        <ol ref={list} className="steps">
          {steps.map((s, i) => (
            <li key={s.title} className="step">
              <span className="step__dot" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <StepArt index={i} />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Reviews() {
  const half = Math.ceil(reviews.items.length / 2);
  const lanes = [reviews.items.slice(0, half), reviews.items.slice(half)];
  return (
    <section className="section s-dark reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="container reviews__head">
        <Heading
          eyebrow="Отзывы"
          title={
            <>
              Что говорят <em className="gold-text">ученицы</em>
            </>
          }
          id="reviews-title"
        />
        <a className="rating" href={contacts.yandexReviews} target="_blank" rel="noopener noreferrer" data-reveal>
          <span className="rating__value gold-text">{reviews.rating}</span>
          <span className="rating__stars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Icon key={i} name="star" size={18} style={{ animationDelay: `${300 + i * 120}ms` }} />
            ))}
          </span>
          <span className="rating__meta">
            {reviews.count} оценок · {reviews.source}
            <span className="rating__link">
              Все отзывы <Icon name="arrow" size={14} />
            </span>
          </span>
        </a>
      </div>

      <div className="lanes">
        {lanes.map((lane, li) => (
          <div key={li} className={`lane ${li % 2 ? 'lane--rev' : ''}`}>
            <div className="lane__track">
              {[...lane, ...lane].map((r, i) => (
                <figure key={i} className="review" aria-hidden={i >= lane.length || undefined}>
                  <span className="review__mark" aria-hidden="true">
                    “
                  </span>
                  <blockquote>{r.text}</blockquote>
                  <figcaption>
                    <span className="review__avatar" aria-hidden="true">
                      {r.name[0]}
                    </span>
                    {r.name}
                    <span className="review__stars" aria-hidden="true">
                      ★★★★★
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section s-light faq" id="faq" aria-labelledby="faq-title">
      <div className="container faq__grid">
        <div className="faq__aside">
          <Heading
            eyebrow="Вопросы"
            title={
              <>
                Частые <em className="gold-text">вопросы</em>
              </>
            }
            lead="Собрали то, о чём чаще всего спрашивают перед первым занятием."
            id="faq-title"
          />
          <div className="faq__art-card" data-reveal>
            <Draw viewBox="0 0 260 320" width={2} className="faq__art" title="Рисунок: лента вокруг пилона в форме вопросительного знака">
              <path pathLength={1} d="M130 14V306" stroke="#a9a6a0" strokeWidth={5} />
              <path pathLength={1} d="M112 306H148M118 14H142" />
              <path pathLength={1} d="M64 104C60 56 100 30 140 34C186 38 206 80 186 112C172 134 146 140 136 166C132 178 132 190 133 204" strokeWidth={3} />
              <path pathLength={1} d="M64 104C70 96 78 94 86 98" strokeWidth={1.4} opacity=".7" />
              <circle pathLength={1} cx="133" cy="238" r="9" strokeWidth={3} />
              <path pathLength={1} d="M214 46C215 56 219 60 228 61C219 62 215 66 214 76C213 66 209 62 200 61C209 60 213 56 214 46Z" strokeWidth={1.4} />
              <path pathLength={1} d="M52 176C53 183 56 186 62 187C56 188 53 191 52 198C51 191 48 188 42 187C48 186 51 183 52 176Z" strokeWidth={1.4} />
              <path pathLength={1} d="M200 238C201 244 204 247 210 248C204 249 201 252 200 258C199 252 196 249 190 248C196 247 199 244 200 238Z" strokeWidth={1.4} />
            </Draw>
            <p className="faq__art-title">Остался вопрос?</p>
            <p className="faq__art-text">Позвоните или напишите — ответим, подскажем группу и время для первого занятия.</p>
            <div className="faq__art-actions">
              <a className="btn btn--dark btn--sm" href={contacts.phoneHref}>
                <span className="btn__label">{contacts.phone}</span>
              </a>
              <a className="faq__tg" href={contacts.socials[0].href} target="_blank" rel="noopener noreferrer" aria-label="Написать в Telegram">
                <Icon name="telegram" />
              </a>
            </div>
          </div>
        </div>
        <div className="faq__list">
          {faq.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className={`qa ${isOpen ? 'is-open' : ''}`} data-reveal data-reveal-delay={i * 50}>
                <h3>
                  <button type="button" aria-expanded={isOpen} aria-controls={`qa-${i}`} id={`qa-btn-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                    <span>{f.q}</span>
                    <span className="qa__icon" aria-hidden="true" />
                  </button>
                </h3>
                <div className="qa__body" id={`qa-${i}`} role="region" aria-labelledby={`qa-btn-${i}`}>
                  <div>
                    <p>{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
