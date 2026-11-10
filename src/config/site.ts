import { asset } from '../lib/paths.ts';

/**
 * Всё содержимое сайта в одном месте: тексты, цены, команда, отзывы, контакты.
 * Цены — с карточек студии (BASE, VIP, индивидуальные) и из онлайн-записи YCLIENTS (ноябрь 2026).
 */

export type Photo = { src: string; alt: string; focus?: string; wide?: boolean; w: number; h: number };

/** Natural sizes, so every frame can use the photo's own proportions and nothing is cropped. */
const sizes: Record<string, [number, number]> = {
  flag: [1280, 852],
  inverted: [851, 1280],
  lean: [851, 1280],
  crouch: [1280, 852],
  white: [851, 1280],
  'lean-red': [852, 1280],
  'crouch-red': [1280, 852],
  split: [851, 1280],
  entrance: [903, 1198],
  'hall-1': [960, 1280],
  'hall-2': [960, 1280],
  'hall-neon-v': [960, 1280],
  'hall-neon': [1280, 960],
  'hall-3': [960, 1280],
  'hall-4': [1280, 960],
  'hall-day': [1280, 960],
  'promo-trial': [721, 1280],
  'promo-friend': [852, 1280],
};

const p = (name: string, alt: string, focus?: string, wide?: boolean): Photo => ({
  src: asset(`/photos/${name}.webp`),
  alt,
  focus,
  wide,
  w: sizes[name][0],
  h: sizes[name][1],
});

/** CSS aspect-ratio of a photo. */
export const ratio = (ph: Photo) => `${ph.w} / ${ph.h}`;

export const photos = {
  flag: p('flag', 'Горизонтальный флажок на пилоне', '45% 50%', true),
  inverted: p('inverted', 'Вис вниз головой с прогибом на пилоне', '50% 40%'),
  lean: p('lean', 'Прогиб у пилона на каблуках', '50% 40%'),
  crouch: p('crouch', 'Вис в группировке на каблуках', '50% 50%', true),
  white: p('white', 'Элемент вниз головой в белом образе', '55% 45%'),
  leanRed: p('lean-red', 'Прогиб у пилона, рыжие локоны', '50% 40%'),
  crouchRed: p('crouch-red', 'Вис в группировке, цветное фото', '55% 50%', true),
  split: p('split', 'Шпагат вниз головой на пилоне', '50% 50%'),
  entrance: p('entrance', 'Вход в зал с неоновой вывеской студии', '50% 40%'),
  hall1: p('hall-1', 'Зал с пилонами и зеркалами', '50% 60%'),
  hall2: p('hall-2', 'Зал студии при дневном свете', '50% 60%'),
  hallNeonV: p('hall-neon-v', 'Зал с фиолетовой подсветкой зеркал', '50% 60%'),
  hallNeon: p('hall-neon', 'Зал с неоновой подсветкой', '50% 60%', true),
  hall3: p('hall-3', 'Пилоны в зале', '50% 60%'),
  hall4: p('hall-4', 'Зал студии, вид на зону отдыха', '50% 60%', true),
  hallDay: p('hall-day', 'Зал студии при дневном свете', '50% 60%', true),
  promoTrial: p('promo-trial', 'Афиша: бесплатное пробное занятие', '50% 0%'),
  promoFriend: p('promo-friend', 'Афиша: приведи друга — скидка 10%', '50% 50%'),
};

export type SocialId = 'telegram' | 'vk' | 'instagram' | 'youtube' | 'dzen';

export const contacts = {
  brand: 'Pole Dance Kiseleva',
  phone: '+7 (910) 473-42-53',
  phoneHref: 'tel:+79104734253',
  city: 'Москва',
  address: 'ул. Саянская, 7',
  addressNote: '4 этаж, студия №403',
  metro: 'Новогиреево',
  hoursNote: 'Тренировки по расписанию, открыто до 22:00',
  booking: 'https://n1093113.yclients.com/',
  bookingGroups: 'https://n1093113.yclients.com/company/1010148/activity/select',
  bookingPersonal: 'https://n1093113.yclients.com/company/1010148/personal/select-services',
  bookingMaster: 'https://n1093113.yclients.com/company/1010148/personal/select-master',
  route: 'https://yandex.ru/navi/org/pole_dance_kiseleva/87416042461?si=p8u6zxxz9237gev6py7davz9tw',
  yandex: 'https://yandex.ru/maps/org/pole_dance_kiseleva/87416042461/',
  yandexReviews: 'https://yandex.ru/maps/org/pole_dance_kiseleva/87416042461/reviews/',
  mapWidget: 'https://yandex.ru/map-widget/v1/org/pole_dance_kiseleva/87416042461/?z=16',
  socials: [
    { id: 'telegram', label: 'Telegram', href: 'https://t.me/poledancekiseleva1' },
    { id: 'vk', label: 'ВКонтакте', href: 'https://vk.com/poledance.kiseleva' },
    { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/poledance.kiseleva' },
    { id: 'youtube', label: 'YouTube', href: 'https://youtube.com/@poledance.kiseleva' },
    { id: 'dzen', label: 'Дзен', href: 'https://dzen.ru/poledancekiseleva' },
  ] as { id: SocialId; label: string; href: string }[],
};

/** Short news shown as a card in the corner (edited in the panel; off by default). */
export const announcement = {
  enabled: false,
  title: 'Новость студии',
  text: '',
  link: '',
  linkLabel: 'Подробнее',
};

export const nav = [
  { href: '#studio', label: 'Студия' },
  { href: '#directions', label: 'Направления' },
  { href: '#gallery', label: 'Галерея' },
  { href: '#prices', label: 'Цены' },
  { href: '#team', label: 'Тренеры' },
  { href: '#reviews', label: 'Отзывы' },
  { href: '#contacts', label: 'Контакты' },
];

export const hero = {
  eyebrow: 'Студия танцев на пилоне · Москва, Новогиреево',
  words: ['сильнее', 'смелее', 'грациознее', 'свободнее', 'увереннее'],
  lead:
    'Pole dance sport, exotic, fitness, растяжка и детские группы. Просторный зал с зеркалами во всю стену, свой пилон у каждой ученицы и тренеры, которые находят подход к каждой.',
  stats: [
    { value: '5,0', label: 'рейтинг на Яндекс Картах' },
    { value: '108', label: 'оценок учениц' },
    { value: '9', label: 'тренеров в команде' },
  ],
  badge: 'Хорошее место 2026',
};

export const marquee = ['Pole Dance Sport', 'Exotic', 'Растяжка', 'Pole Fitness', 'Kids', 'Индивидуально', 'Массаж', 'Косметология'];

export const studio = {
  title: 'Зал, в который хочется возвращаться',
  text: [
    'Студия на 4 этаже в доме 7 на Саянской улице — светлый зал с высокими потолками, зеркалами во всю стену и неоновой подсветкой для вечерних тренировок.',
    'На занятии у каждой ученицы свой пилон, поэтому не нужно ждать очереди: всё время уходит на практику. После тренировки можно отдохнуть на диване в зоне отдыха или записаться на массаж и уход в кабинете студии.',
  ],
  facts: [
    { icon: 'pole', title: 'Свой пилон', text: 'у каждой ученицы на занятии' },
    { icon: 'mirror', title: 'Зеркала', text: 'во всю стену с подсветкой' },
    { icon: 'heart', title: 'Новичкам', text: 'группы с нуля и пробное занятие' },
    { icon: 'spa', title: 'Массаж и уход', text: 'кабинет прямо в студии' },
  ],
  gallery: [photos.entrance, photos.hall1, photos.hallNeonV, photos.hall3],
};

export type DirectionId = 'sport' | 'exotic' | 'fitness' | 'stretch' | 'kids' | 'personal';

export type Direction = {
  id: DirectionId;
  title: string;
  tag: string;
  text: string;
  points: string[];
  photo: Photo;
  plan: string;
};

export const directions: Direction[] = [
  {
    id: 'sport',
    title: 'Pole Dance Sport',
    tag: 'Сила и трюки',
    text: 'Спортивное направление: вращения, висы, перевороты и силовые элементы. Тело становится сильным и рельефным, а каждое занятие — маленькой победой.',
    points: ['Вращения и висы', 'Силовые элементы', 'Связки и трюки'],
    photo: photos.flag,
    plan: 'Абонемент VIP или индивидуально',
  },
  {
    id: 'exotic',
    title: 'Pole Dance Exotic',
    tag: 'Пластика на каблуках',
    text: 'Чувственный танец на высоких каблуках: волны, партер, плавные переходы и работа у пилона. Про женственность, характер и уверенность в себе.',
    points: ['Партер и волны', 'Танец на стрипах', 'Хореография связок'],
    photo: photos.lean,
    plan: 'Абонемент VIP или индивидуально',
  },
  {
    id: 'fitness',
    title: 'Pole Dance Fitness',
    tag: 'Тело в тонусе',
    text: 'Тренировка у пилона на всё тело: мышцы кора, руки, спина и выносливость. Отличный старт для новичков и способ держать форму.',
    points: ['Сила и выносливость', 'Базовые вращения', 'Работа над осанкой'],
    photo: photos.crouch,
    plan: 'Абонемент VIP',
  },
  {
    id: 'stretch',
    title: 'Растяжка',
    tag: 'Гибкость и лёгкость',
    text: 'Шпагаты, мостики и подвижная спина. Растяжка делает элементы на пилоне красивее и безопаснее, а тело — лёгким и свободным.',
    points: ['Шпагаты', 'Гибкая спина', 'Мягкая работа с телом'],
    photo: photos.split,
    plan: 'Групповой абонемент или индивидуально',
  },
  {
    id: 'kids',
    title: 'Pole Dance Kids',
    tag: 'Для детей',
    text: 'Детские группы: ловкость, гибкость, осанка и координация. Занятия проходят под присмотром тренера, в бережном темпе.',
    points: ['Гибкость и ловкость', 'Красивая осанка', 'Уверенность в себе'],
    photo: photos.hall3,
    plan: 'Абонемент VIP',
  },
  {
    id: 'personal',
    title: 'Индивидуально',
    tag: 'Один на один',
    text: 'Персональная тренировка по Sport, Exotic или растяжке — в вашем темпе и под вашу цель. Можно вдвоём с подругой: сплит-тренировка.',
    points: ['Программа под вас', 'Сплит-тренировка вдвоём', 'С Евгенией Киселёвой'],
    photo: photos.white,
    plan: 'От 2 000 ₽ за пробную',
  },
];

/** Вопросы подбора направления: каждый ответ добавляет очки направлениям. */
export const quiz: { q: string; answers: { label: string; score: Partial<Record<DirectionId, number>> }[] }[] = [
  {
    q: 'Для кого ищете занятия?',
    answers: [
      { label: 'Для себя', score: {} },
      { label: 'Для ребёнка', score: { kids: 10 } },
      { label: 'Хочу заниматься с подругой', score: { personal: 2, fitness: 1 } },
    ],
  },
  {
    q: 'Что хочется получить в первую очередь?',
    answers: [
      { label: 'Силу и красивые трюки', score: { sport: 3 } },
      { label: 'Женственность и пластику', score: { exotic: 3 } },
      { label: 'Подтянутое тело', score: { fitness: 3 } },
      { label: 'Гибкость и шпагат', score: { stretch: 3 } },
    ],
  },
  {
    q: 'Как вы относитесь к высоким каблукам?',
    answers: [
      { label: 'Обожаю, хочу танцевать на них', score: { exotic: 3 } },
      { label: 'Лучше босиком', score: { sport: 1, fitness: 1, stretch: 1 } },
      { label: 'Пока не знаю', score: { fitness: 1 } },
    ],
  },
  {
    q: 'Есть ли у вас опыт?',
    answers: [
      { label: 'Никогда не пробовала', score: { fitness: 2, stretch: 1 } },
      { label: 'Немного занималась', score: { sport: 1, exotic: 1 } },
      { label: 'Хочу расти быстрее', score: { personal: 3, sport: 1 } },
    ],
  },
];

export type Package = { count: number; price: number; days?: number };

export const pricing = {
  trial: {
    free: 'Пробное — бесплатно при покупке абонемента в день пробного занятия',
    paid: 700,
  },
  base: {
    id: 'base',
    title: 'BASE',
    subtitle: 'Групповые тренировки',
    single: 1000,
    packages: [
      { count: 4, price: 3600, days: 30 },
      { count: 6, price: 5100, days: 30 },
      { count: 8, price: 6400, days: 30 },
      { count: 12, price: 9000, days: 45 },
    ] as Package[],
    note: 'Не распространяется на Pole Dance Sport, Exotic, Fitness и Kids',
  },
  vip: {
    id: 'vip',
    title: 'VIP',
    subtitle: 'Все направления студии',
    single: 1200,
    packages: [
      { count: 4, price: 4000, days: 30 },
      { count: 6, price: 5700, days: 30 },
      { count: 8, price: 7200, days: 30 },
      { count: 12, price: 10200, days: 45 },
      { count: 16, price: 12800 },
      { count: 24, price: 16800 },
    ] as Package[],
    note: 'Распространяется на все направления студии',
  },
  personal: [
    {
      id: 'coach',
      title: 'С тренером студии',
      rows: [
        { label: 'Пробная тренировка', price: '2 000 ₽' },
        { label: 'Разовая тренировка', price: '3 000 ₽' },
        { label: 'Абонемент на 4 тренировки', price: '11 200 ₽' },
        { label: 'Абонемент на 8 тренировок', price: '20 000 ₽' },
        { label: 'Абонемент на 12 тренировок', price: '27 600 ₽' },
        { label: 'Сплит-тренировка (вдвоём)', price: '2 000 + 2 000 ₽' },
      ],
    },
    {
      id: 'kiseleva',
      title: 'С Евгенией Киселёвой',
      rows: [
        { label: 'Пробная тренировка', price: '3 000 ₽' },
        { label: 'Разовая тренировка', price: '4 000 ₽' },
        { label: 'Абонемент на 4 тренировки', price: '14 800 ₽' },
        { label: 'Абонемент на 8 тренировок', price: '28 000 ₽' },
        { label: 'Абонемент на 12 тренировок', price: '36 000 ₽' },
        { label: 'Сплит-тренировка (вдвоём)', price: '2 500 + 2 500 ₽' },
      ],
    },
  ],
  personalNotes: [
    'Абонементы на 4 и 8 тренировок действуют 30 дней, на 12 — 45 дней',
    'Отмена или перенос без потери тренировки — за 12 часов',
    'Скидка 15% при действующем абонементе на групповые тренировки',
  ],
};

export const promos = [
  {
    id: 'trial',
    title: 'Бесплатное пробное',
    text: 'Пробное занятие в группе — бесплатно, если в тот же день вы покупаете абонемент. Без покупки — 700 ₽.',
    photo: photos.promoTrial,
    cta: 'Записаться на пробное',
  },
  {
    id: 'friend',
    title: 'Приведи подругу',
    text: 'Приходите вдвоём — и обе получите скидку 10% на любой абонемент. Танцевать вместе веселее!',
    photo: photos.promoFriend,
    cta: 'Записаться вдвоём',
  },
];

export const founder = {
  name: 'Евгения Киселёва',
  role: 'Основательница студии и ТОП-тренер',
  text: [
    'Евгения создала студию, в которой каждой ученице уютно с первого занятия. Она ведёт Pole Dance Sport, Exotic и растяжку, а на индивидуальных тренировках помогает поставить связку или танец.',
    'Ученицы в отзывах говорят о ней одно и то же: улыбчивая, с юмором, уделяет максимум внимания и умеет держать группу.',
  ],
  quote: 'Тренер с прекрасным настроением и энергетикой',
  quoteAuthor: 'Даша, отзыв на Яндекс Картах',
  photo: photos.leanRed,
};

export type Person = { name: string; role: string; photo?: string };

export const team: Person[] = [
  { name: 'Евгения Киселёва', role: 'Руководитель, ТОП-тренер', photo: asset('/team/kiseleva.webp') },
  { name: 'Анастасия Туркова', role: 'Тренер', photo: asset('/team/turkova.webp') },
  { name: 'Екатерина Максимова', role: 'Тренер', photo: asset('/team/maksimova.webp') },
  { name: 'Наталья', role: 'Тренер' },
  { name: 'Анна Кудинова', role: 'Тренер', photo: asset('/team/kudinova.webp') },
  { name: 'Марина Можаева', role: 'Тренер', photo: asset('/team/mozhaeva.webp') },
  { name: 'Лилия Сотникова', role: 'Тренер', photo: asset('/team/sotnikova.webp') },
  { name: 'Александра Ким', role: 'Тренер', photo: asset('/team/kim.webp') },
  { name: 'Анастасия Головина', role: 'Тренер' },
];

export const care = {
  title: 'Массаж и уход после тренировки',
  lead: 'В студии работает кабинет массажа и аппаратной косметологии. Можно восстановиться после нагрузки или пройти курс по фигуре и лицу.',
  tabs: [
    {
      id: 'massage',
      title: 'Массаж',
      items: [
        { name: 'Классический / спортивный', time: '30 · 60 · 90 мин', price: 'от 1 900 ₽' },
        { name: 'Расслабляющий', time: '45 · 60 · 90 мин', price: 'от 1 900 ₽' },
        { name: 'Антицеллюлитный', time: '30 · 60 · 90 мин', price: 'от 2 000 ₽' },
        { name: 'Медовый', time: '30 · 60 мин', price: 'от 2 000 ₽' },
        { name: 'Стоун-массаж горячими камнями', time: '30 · 60 · 90 мин', price: 'от 1 900 ₽' },
        { name: 'Огненный массаж', time: '30 · 60 мин', price: 'от 2 500 ₽' },
        { name: 'Массаж банками', time: '30 · 60 мин', price: 'от 1 900 ₽' },
      ],
      note: 'Абонементы на 60 минут: 5 сеансов — 13 000 ₽, 10 сеансов — 25 000 ₽',
    },
    {
      id: 'body',
      title: 'Тело',
      items: [
        { name: 'LPG-массаж', time: '45 мин', price: 'от 1 500 ₽' },
        { name: 'Кавитация', time: '30 мин · всё тело', price: 'от 1 500 ₽' },
        { name: 'RF-лифтинг', time: '30 · 60 мин', price: 'от 1 500 ₽' },
        { name: 'Миостимуляция', time: '30 · 60 мин', price: 'от 1 200 ₽' },
        { name: 'Лазерный липолиз', time: '30 · 60 мин', price: 'от 1 200 ₽' },
        { name: 'Прессотерапия', time: '40 мин', price: '1 000 ₽' },
      ],
      note: 'LPG: пробный сеанс 1 500 ₽, абонемент на 5 сеансов — 8 500 ₽, на 10 — 15 000 ₽',
    },
    {
      id: 'face',
      title: 'Лицо',
      items: [
        { name: 'RF-лифтинг лица + уход', time: '40 мин', price: '1 500 ₽' },
        { name: 'Микротоки с биофотоном', time: '30 · 60 мин', price: 'от 1 500 ₽' },
        { name: 'Anti-age массаж лица + уход', time: '40 мин', price: '1 800 ₽' },
        { name: 'Скульптурный массаж + уход', time: '50 мин', price: '2 000 ₽' },
        { name: 'Королевский пилинг', time: '50 мин', price: '2 500 ₽' },
        { name: 'Комплекс: массаж + RF + маска', time: '1 ч 40 мин', price: '2 500 ₽' },
      ],
      note: 'Уход после процедур лица — в подарок',
    },
  ],
};

export const steps = [
  { title: 'Запишитесь', text: 'Выберите направление и время в онлайн-записи или позвоните нам.' },
  { title: 'Возьмите форму', text: 'Шорты и топ — открытая кожа держит пилон. Воду и полотенце. В день тренировки не наносите крем на тело.' },
  { title: 'Приходите заранее', text: 'За 10–15 минут: ул. Саянская 7, 4 этаж, студия №403. Переоденетесь и познакомитесь с тренером.' },
  { title: 'Танцуйте', text: 'Разминка, первые вращения и элементы, растяжка в конце. Тренер подстрахует и подскажет.' },
  { title: 'Оставайтесь', text: 'Купите абонемент в тот же день — и пробное занятие будет бесплатным.' },
];

export const reviews = {
  rating: '5,0',
  count: 108,
  source: 'Яндекс Карты',
  items: [
    { name: 'Ксения', text: 'Каждый урок проходит на высоком уровне, тренеры всегда находят подход к каждому ученику.' },
    { name: 'Кристина', text: 'Тренер — Евгения очень улыбчивая, с юмором, хорошо держит группу.' },
    { name: 'Лиза', text: 'Студия, которая недалеко от дома, с такой приятной атмосферой и тренерами!' },
    { name: 'Даша', text: 'Занимаюсь у Жени несколько лет, в студии всегда чисто, тренер с прекрасным настроением и энергетикой.' },
    { name: 'Ирина К.', text: 'У каждой свой пилон, что важно, потому что в некоторых студиях 1 пилон на занятии на 2–3 человека.' },
    { name: 'Юлия', text: 'Женя мне уделила максимум внимания, всё показывала, помогала.' },
  ],
};

export const faq = [
  {
    q: 'Я никогда не занималась. У меня получится?',
    a: 'Да. В студии есть группы для начинающих, а тренер подбирает нагрузку под уровень каждой ученицы. Начните с пробного занятия — сразу почувствуете, ваше ли это.',
  },
  {
    q: 'Что взять на первую тренировку?',
    a: 'Шорты и топ: пилон держится за счёт сцепления с кожей, поэтому ноги и руки должны быть открыты. Воду и полотенце. В день тренировки не наносите крем или масло на тело. Каблуки нужны только для Exotic — на первых занятиях можно без них.',
  },
  {
    q: 'Сколько стоит пробное занятие?',
    a: 'Групповое пробное — бесплатно, если в тот же день купить абонемент, без покупки — 700 ₽. Индивидуальная пробная тренировка — 2 000 ₽ с тренером студии и 3 000 ₽ с Евгенией Киселёвой.',
  },
  {
    q: 'Чем отличаются абонементы BASE и VIP?',
    a: 'VIP действует на все направления студии. BASE дешевле, но не распространяется на Pole Dance Sport, Exotic, Fitness и Kids. Абонементы на 4, 6 и 8 тренировок действуют 30 дней, на 12 тренировок — 45 дней.',
  },
  {
    q: 'Сколько человек занимается на одном пилоне?',
    a: 'Один человек — один пилон. Не нужно ждать очереди, всё занятие уходит на практику.',
  },
  {
    q: 'Можно ли перенести индивидуальную тренировку?',
    a: 'Да, отмена или перенос без потери тренировки возможны, если предупредить за 12 часов.',
  },
  {
    q: 'Есть ли занятия для детей?',
    a: 'Да, направление Pole Dance Kids. Возраст и расписание групп уточняйте по телефону или в онлайн-записи.',
  },
  {
    q: 'Как до вас добраться?',
    a: 'Москва, ул. Саянская 7, 4 этаж, студия №403 — от метро Новогиреево. В здании есть лифт, рядом парковка и остановка «Саянская улица, 5».',
  },
];
