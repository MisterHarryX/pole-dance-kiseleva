import { useMemo, useState, type KeyboardEvent } from 'react';
import { contacts, directions, quiz, type DirectionId } from '../../config/site.ts';
import { spotlight, tiltLeave, tiltMove } from '../../hooks/useTilt.ts';
import { DecoCorners, DirectionArt } from '../ui/Art.tsx';
import { Heading } from '../ui/Heading.tsx';
import { PhotoStage } from '../ui/PhotoStage.tsx';
import { Icon } from '../ui/Icon.tsx';

function Quiz({ onPick }: { onPick: (id: DirectionId) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const done = step >= quiz.length;

  const result = useMemo(() => {
    if (!done) return null;
    const score: Partial<Record<DirectionId, number>> = {};
    answers.forEach((a, qi) => {
      for (const [id, n] of Object.entries(quiz[qi].answers[a].score)) {
        score[id as DirectionId] = (score[id as DirectionId] ?? 0) + (n ?? 0);
      }
    });
    const best = (Object.entries(score) as [DirectionId, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'fitness';
    return directions.find((d) => d.id === best)!;
  }, [done, answers]);

  const choose = (i: number) => {
    setAnswers((a) => [...a.slice(0, step), i]);
    setStep((s) => s + 1);
  };
  const restart = () => {
    setStep(0);
    setAnswers([]);
  };

  return (
    <div className="quiz" data-reveal>
      <div className="quiz__head">
        <span className="quiz__badge">
          <Icon name="sparkle" size={14} /> Подбор за 30 секунд
        </span>
        <h3>Не знаете, с чего начать?</h3>
        <div className="quiz__progress" aria-hidden="true">
          {quiz.map((_, i) => (
            <span key={i} className={i < step ? 'is-done' : i === step ? 'is-now' : ''} />
          ))}
        </div>
      </div>

      {!done ? (
        <div className="quiz__body" key={step} aria-live="polite">
          <p className="quiz__q">
            <span>
              {step + 1} / {quiz.length}
            </span>
            {quiz[step].q}
          </p>
          <div className="quiz__answers">
            {quiz[step].answers.map((a, i) => (
              <button key={a.label} type="button" className="quiz__answer" onClick={() => choose(i)} style={{ animationDelay: `${i * 60}ms` }}>
                {a.label}
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
          {step > 0 && (
            <button type="button" className="quiz__back" onClick={() => setStep((s) => s - 1)}>
              ← Назад
            </button>
          )}
        </div>
      ) : (
        result && (
          <div className="quiz__result" aria-live="polite">
            <span className="quiz__result-photo">
              <img src={result.photo.src.replace('.webp', '-sm.webp')} alt="" style={{ aspectRatio: `${result.photo.w} / ${result.photo.h}` }} />
            </span>
            <div>
              <p className="quiz__result-kicker">Вам подойдёт</p>
              <p className="quiz__result-title gold-text">{result.title}</p>
              <p className="quiz__result-text">{result.tag}. Начните с пробного занятия — тренер подскажет, как двигаться дальше.</p>
              <div className="quiz__result-actions">
                <button type="button" className="btn btn--gold btn--sm" onClick={() => onPick(result.id)}>
                  <span className="btn__label">Подробнее о направлении</span>
                </button>
                <button type="button" className="quiz__back" onClick={restart}>
                  Пройти заново
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export function Directions() {
  const [active, setActive] = useState<DirectionId>('sport');
  const current = directions.find((d) => d.id === active)!;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = directions.findIndex((d) => d.id === active);
    let n = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % directions.length;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + directions.length) % directions.length;
    if (n < 0) return;
    e.preventDefault();
    setActive(directions[n].id);
    document.getElementById(`dir-tab-${directions[n].id}`)?.focus();
  };

  const pick = (id: DirectionId) => {
    setActive(id);
    document.getElementById('directions-stage')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section className="section s-dark directions" id="directions" aria-labelledby="dir-title">
      <div className="container">
        <Heading
          eyebrow="Направления"
          title={
            <>
              Найдите <em className="gold-text">свой</em> стиль
            </>
          }
          lead="От силовых трюков до чувственной пластики на каблуках. Выберите направление — или пройдите короткий тест ниже."
          id="dir-title"
        />

        <div className="directions__layout" id="directions-stage">
          <div className="directions__list" role="tablist" aria-label="Направления" aria-orientation="vertical" onKeyDown={onKey}>
            {directions.map((d, i) => (
              <button
                key={d.id}
                id={`dir-tab-${d.id}`}
                type="button"
                role="tab"
                aria-selected={d.id === active}
                aria-controls="dir-panel"
                tabIndex={d.id === active ? 0 : -1}
                className="directions__tab"
                onClick={() => setActive(d.id)}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(d.id)}
                data-reveal
                data-reveal-delay={i * 70}
              >
                <span className="directions__num">0{i + 1}</span>
                <span className="directions__name">{d.title}</span>
                <span className="directions__tag">{d.tag}</span>
                <DirectionArt id={d.id} className="directions__icon" />
              </button>
            ))}
          </div>

          <article
            id="dir-panel"
            role="tabpanel"
            aria-labelledby={`dir-tab-${active}`}
            className="dir-card"
            onPointerMove={(e) => {
              tiltMove(e, 4);
              spotlight(e);
            }}
            onPointerLeave={tiltLeave}
            data-reveal
          >
            <PhotoStage
              className="dir-card__media"
              photos={directions.map((d) => d.photo)}
              active={directions.findIndex((d) => d.id === active)}
            >
              <DecoCorners />
            </PhotoStage>
            <div className="dir-card__body" key={current.id}>
              <DirectionArt id={current.id} className="dir-card__art" />
              <p className="dir-card__tag">{current.tag}</p>
              <h3 className="dir-card__title">{current.title}</h3>
              <p className="dir-card__text">{current.text}</p>
              <ul className="dir-card__points">
                {current.points.map((pt) => (
                  <li key={pt}>
                    <Icon name="check" size={16} />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="dir-card__foot">
                <span className="dir-card__plan">{current.plan}</span>
                <a
                  className="btn btn--gold btn--sm"
                  href={current.id === 'personal' ? contacts.bookingPersonal : contacts.booking}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="btn__label">Записаться</span>
                </a>
              </div>
            </div>
          </article>
        </div>

        <Quiz onPick={pick} />
      </div>
    </section>
  );
}
