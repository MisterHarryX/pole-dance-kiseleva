import type { ContentKey } from '../../shared/content.ts';

/**
 * What the panel lets the studio edit, section by section. The form is built from these
 * descriptions, and only the listed fields are saved as overrides of src/config/site.ts.
 */
export type Field =
  | { kind: 'text'; key: string; label: string; hint?: string; placeholder?: string }
  | { kind: 'textarea'; key: string; label: string; hint?: string; rows?: number; placeholder?: string }
  | { kind: 'number'; key: string; label: string; suffix?: string; hint?: string }
  | { kind: 'toggle'; key: string; label: string; hint?: string }
  | { kind: 'image'; key: string; label: string; shape: 'url' | 'photo'; hint?: string; round?: boolean }
  | { kind: 'strings'; key: string; label: string; add?: string; hint?: string; multiline?: boolean }
  | {
      kind: 'list';
      key: string;
      label: string;
      item: Field[];
      title?: (item: Record<string, unknown>, index: number) => string;
      add?: string;
      fixed?: boolean;
      blank?: () => Record<string, unknown>;
      hint?: string;
    }
  | { kind: 'group'; key: string; label: string; fields: Field[]; hint?: string };

export type Section = { key: ContentKey; title: string; icon: string; description: string; fields: Field[] };

const s = (v: unknown) => (typeof v === 'string' ? v : '');

const packages = (label: string): Field => ({
  kind: 'list',
  key: 'packages',
  label,
  add: 'Добавить абонемент',
  blank: () => ({ count: 4, price: 0, days: 30 }),
  title: (it) => `${it.count} тренировок — ${Number(it.price).toLocaleString('ru-RU')} ₽`,
  item: [
    { kind: 'number', key: 'count', label: 'Тренировок' },
    { kind: 'number', key: 'price', label: 'Цена', suffix: '₽' },
    { kind: 'number', key: 'days', label: 'Действует', suffix: 'дней', hint: 'Пусто — «уточняйте»' },
  ],
});

export const sections: Section[] = [
  {
    key: 'announcement',
    title: 'Объявление',
    icon: 'sparkle',
    description: 'Короткая новость в углу сайта: новая группа, мастер-класс, акция. Покажется через пару секунд после открытия.',
    fields: [
      { kind: 'toggle', key: 'enabled', label: 'Показывать объявление' },
      { kind: 'text', key: 'title', label: 'Заголовок', placeholder: 'Новость студии' },
      { kind: 'textarea', key: 'text', label: 'Текст', rows: 3, placeholder: 'С 1 декабря — новая группа Exotic по средам в 19:00' },
      { kind: 'text', key: 'link', label: 'Ссылка (необязательно)', placeholder: 'https://…' },
      { kind: 'text', key: 'linkLabel', label: 'Текст ссылки', placeholder: 'Записаться' },
    ],
  },
  {
    key: 'hero',
    title: 'Первый экран',
    icon: 'star',
    description: 'Подзаголовок, меняющиеся слова, описание и цифры под кнопками.',
    fields: [
      { kind: 'text', key: 'eyebrow', label: 'Надпись над названием' },
      { kind: 'strings', key: 'words', label: 'Слова после «Танец, в котором вы становитесь…»', add: 'Добавить слово' },
      { kind: 'textarea', key: 'lead', label: 'Описание', rows: 4 },
      {
        kind: 'list',
        key: 'stats',
        label: 'Цифры',
        fixed: true,
        title: (it) => `${s(it.value)} — ${s(it.label)}`,
        item: [
          { kind: 'text', key: 'value', label: 'Число', hint: 'Например 5,0 или 108' },
          { kind: 'text', key: 'label', label: 'Подпись' },
        ],
      },
      { kind: 'text', key: 'badge', label: 'Плашка у фото' },
    ],
  },
  {
    key: 'pricing',
    title: 'Цены',
    icon: 'calendar',
    description: 'Абонементы BASE и VIP для калькулятора, пробное занятие и индивидуальные тренировки.',
    fields: [
      { kind: 'group', key: 'trial', label: 'Пробное занятие', fields: [{ kind: 'number', key: 'paid', label: 'Без покупки абонемента', suffix: '₽' }] },
      {
        kind: 'group',
        key: 'vip',
        label: 'Абонемент VIP',
        fields: [{ kind: 'number', key: 'single', label: 'Разовое занятие', suffix: '₽' }, packages('Абонементы VIP'), { kind: 'text', key: 'note', label: 'Пояснение' }],
      },
      {
        kind: 'group',
        key: 'base',
        label: 'Абонемент BASE',
        fields: [{ kind: 'number', key: 'single', label: 'Разовое занятие', suffix: '₽' }, packages('Абонементы BASE'), { kind: 'text', key: 'note', label: 'Пояснение' }],
      },
      {
        kind: 'list',
        key: 'personal',
        label: 'Индивидуальные тренировки',
        fixed: true,
        title: (it) => s(it.title),
        item: [
          { kind: 'text', key: 'title', label: 'Название' },
          {
            kind: 'list',
            key: 'rows',
            label: 'Строки прайса',
            add: 'Добавить строку',
            blank: () => ({ label: '', price: '' }),
            title: (it) => `${s(it.label)} — ${s(it.price)}`,
            item: [
              { kind: 'text', key: 'label', label: 'Что' },
              { kind: 'text', key: 'price', label: 'Цена', placeholder: '3 000 ₽' },
            ],
          },
        ],
      },
      { kind: 'strings', key: 'personalNotes', label: 'Условия индивидуальных', add: 'Добавить условие', multiline: true },
    ],
  },
  {
    key: 'promos',
    title: 'Акции',
    icon: 'heart',
    description: 'Две афиши с условиями на обороте.',
    fields: [
      {
        kind: 'list',
        key: '',
        label: 'Акции',
        fixed: true,
        title: (it) => s(it.title),
        item: [
          { kind: 'text', key: 'title', label: 'Название' },
          { kind: 'textarea', key: 'text', label: 'Условия', rows: 3 },
          { kind: 'text', key: 'cta', label: 'Текст кнопки' },
          { kind: 'image', key: 'photo', label: 'Афиша', shape: 'photo', hint: 'Вертикальная картинка, показывается целиком' },
        ],
      },
    ],
  },
  {
    key: 'directions',
    title: 'Направления',
    icon: 'pole',
    description: 'Тексты шести направлений. Фото и рисунки привязаны к направлению.',
    fields: [
      {
        kind: 'list',
        key: '',
        label: 'Направления',
        fixed: true,
        title: (it) => s(it.title),
        item: [
          { kind: 'text', key: 'title', label: 'Название' },
          { kind: 'text', key: 'tag', label: 'Коротко' },
          { kind: 'textarea', key: 'text', label: 'Описание', rows: 3 },
          { kind: 'strings', key: 'points', label: 'Пункты', add: 'Добавить пункт' },
          { kind: 'text', key: 'plan', label: 'Какой абонемент' },
        ],
      },
    ],
  },
  {
    key: 'team',
    title: 'Тренеры',
    icon: 'heart',
    description: 'Команда студии. Евгения показывается отдельным блоком, остальные — карточками.',
    fields: [
      {
        kind: 'list',
        key: '',
        label: 'Тренеры',
        add: 'Добавить тренера',
        blank: () => ({ name: '', role: 'Тренер', photo: '' }),
        title: (it) => s(it.name) || 'Новый тренер',
        item: [
          { kind: 'text', key: 'name', label: 'Имя и фамилия' },
          { kind: 'text', key: 'role', label: 'Роль' },
          { kind: 'image', key: 'photo', label: 'Фото', shape: 'url', round: true, hint: 'Квадратное фото лица, без фото — монограмма' },
        ],
      },
    ],
  },
  {
    key: 'founder',
    title: 'Основательница',
    icon: 'star',
    description: 'Блок о Евгении Киселёвой.',
    fields: [
      { kind: 'text', key: 'name', label: 'Имя', hint: 'Должно совпадать с именем в списке тренеров' },
      { kind: 'text', key: 'role', label: 'Подпись' },
      { kind: 'strings', key: 'text', label: 'Абзацы', add: 'Добавить абзац', multiline: true },
      { kind: 'text', key: 'quote', label: 'Цитата' },
      { kind: 'text', key: 'quoteAuthor', label: 'Автор цитаты' },
      { kind: 'image', key: 'photo', label: 'Фото', shape: 'photo' },
    ],
  },
  {
    key: 'care',
    title: 'Массаж и уход',
    icon: 'spa',
    description: 'Процедуры и цены по вкладкам «Массаж», «Тело», «Лицо».',
    fields: [
      { kind: 'text', key: 'title', label: 'Заголовок' },
      { kind: 'textarea', key: 'lead', label: 'Описание', rows: 3 },
      {
        kind: 'list',
        key: 'tabs',
        label: 'Вкладки',
        fixed: true,
        title: (it) => s(it.title),
        item: [
          { kind: 'text', key: 'title', label: 'Название вкладки' },
          {
            kind: 'list',
            key: 'items',
            label: 'Процедуры',
            add: 'Добавить процедуру',
            blank: () => ({ name: '', time: '', price: '' }),
            title: (it) => `${s(it.name)} — ${s(it.price)}`,
            item: [
              { kind: 'text', key: 'name', label: 'Процедура' },
              { kind: 'text', key: 'time', label: 'Длительность', placeholder: '30 · 60 мин' },
              { kind: 'text', key: 'price', label: 'Цена', placeholder: 'от 1 900 ₽' },
            ],
          },
          { kind: 'textarea', key: 'note', label: 'Примечание', rows: 2 },
        ],
      },
    ],
  },
  {
    key: 'steps',
    title: 'Первое занятие',
    icon: 'calendar',
    description: 'Пять шагов от записи до тренировки.',
    fields: [
      {
        kind: 'list',
        key: '',
        label: 'Шаги',
        fixed: true,
        title: (it, i) => `${i + 1}. ${s(it.title)}`,
        item: [
          { kind: 'text', key: 'title', label: 'Шаг' },
          { kind: 'textarea', key: 'text', label: 'Пояснение', rows: 2 },
        ],
      },
    ],
  },
  {
    key: 'reviews',
    title: 'Отзывы',
    icon: 'star',
    description: 'Рейтинг и отзывы учениц (с Яндекс Карт).',
    fields: [
      { kind: 'text', key: 'rating', label: 'Рейтинг', placeholder: '5,0' },
      { kind: 'number', key: 'count', label: 'Оценок' },
      {
        kind: 'list',
        key: 'items',
        label: 'Отзывы',
        add: 'Добавить отзыв',
        blank: () => ({ name: '', text: '' }),
        title: (it) => s(it.name) || 'Новый отзыв',
        item: [
          { kind: 'text', key: 'name', label: 'Имя' },
          { kind: 'textarea', key: 'text', label: 'Отзыв', rows: 3 },
        ],
      },
    ],
  },
  {
    key: 'faq',
    title: 'Вопросы',
    icon: 'sparkle',
    description: 'Частые вопросы и ответы.',
    fields: [
      {
        kind: 'list',
        key: '',
        label: 'Вопросы',
        add: 'Добавить вопрос',
        blank: () => ({ q: '', a: '' }),
        title: (it) => s(it.q) || 'Новый вопрос',
        item: [
          { kind: 'text', key: 'q', label: 'Вопрос' },
          { kind: 'textarea', key: 'a', label: 'Ответ', rows: 4 },
        ],
      },
    ],
  },
  {
    key: 'contacts',
    title: 'Контакты',
    icon: 'phone',
    description: 'Телефон, адрес и ссылки на соцсети.',
    fields: [
      { kind: 'text', key: 'phone', label: 'Телефон', placeholder: '+7 (910) 473-42-53' },
      { kind: 'text', key: 'addressNote', label: 'Этаж и кабинет' },
      { kind: 'text', key: 'hoursNote', label: 'Режим работы' },
      { kind: 'text', key: 'booking', label: 'Онлайн-запись (YCLIENTS)' },
      {
        kind: 'list',
        key: 'socials',
        label: 'Соцсети',
        fixed: true,
        title: (it) => s(it.label),
        item: [{ kind: 'text', key: 'href', label: 'Ссылка' }],
      },
    ],
  },
];

// --- Reading, writing and picking values by field ----------------------------------

type Obj = Record<string, unknown>;

export const getAt = (value: unknown, key: string): unknown => (key === '' ? value : (value as Obj | undefined)?.[key]);

export function setAt<T>(value: T, key: string, next: unknown): T {
  if (key === '') return next as T;
  return { ...(value as Obj), [key]: next } as T;
}

/** Keeps only the fields the form declares (plus `id`), so overrides stay small and photos stay linked. */
export function pick(value: unknown, fields: Field[]): unknown {
  if (fields.length === 1 && fields[0].key === '') return pickField(value, fields[0]);
  const out: Obj = {};
  const src = (value ?? {}) as Obj;
  if (typeof src.id === 'string') out.id = src.id;
  for (const f of fields) out[f.key] = pickField(src[f.key], f);
  return out;
}

function pickField(value: unknown, f: Field): unknown {
  if (f.kind === 'group') return pick(value, f.fields);
  if (f.kind === 'list') return Array.isArray(value) ? value.map((item) => pick(item, f.item)) : [];
  return value;
}
