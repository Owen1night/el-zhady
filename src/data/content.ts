import { learningFacts, learningFigures, learningSources, learningTimeline } from './learning';
import type { ActivityQuestion, ActivityType, HistoricalFact, HistoricalFigure, HistoricalImage, MapLocation, Section, Source, Thesis, TimelineEvent, Video } from './types';

/** No researched historical content is claimed in stage one. Keep this explicit. */
export const contentVersion = 'learning-1';
export const theses: Thesis[] = [];
export const facts: HistoricalFact[] = learningFacts;
export const figures: HistoricalFigure[] = learningFigures;
export const timelineEvents: TimelineEvent[] = learningTimeline;
export const sources: Source[] = learningSources;
export const images: HistoricalImage[] = [];
export const mapLocations: MapLocation[] = [];
export const videos: Video[] = [];
export const questions: ActivityQuestion[] = [];
export const sections: Section[] = [
  { id: 'home', label: 'Басты бет', eyebrow: 'Университеттік оқу жобасы', title: 'Ел жады', description: 'Қазақстан, 1939–1953' },
  { id: 'timeline', label: 'Хронология', eyebrow: '01 / Уақыт желісі', title: 'Уақыт ізімен', description: '1939–1953 жылдар аралығын кезеңдер арқылы зерттеуге арналған бөлім.' },
  { id: 'front', label: 'Майдан', eyebrow: '02 / Соғыс тарихы', title: 'Майдан жолдары', description: 'Қазақстандықтардың майдандағы жолын құжаттар мен жеке тарихтар арқылы ашу жоспарланған.' },
  { id: 'heroes', label: 'Батырлар', eyebrow: '03 / Тұлғалар', title: 'Есімдер мен ерлік', description: 'Кемінде 11 соғыс қаһарманына арналған дерекке негізделген тұлғалар галереясы жоспарланған.' },
  { id: 'homefront', label: 'Тыл', eyebrow: '04 / Еңбек және қоғам', title: 'Тылдағы өмір', description: 'Еңбек, эвакуация және күнделікті өмір тақырыптарын зерттеуге арналған кеңістік.' },
  { id: 'postwar', label: 'Соғыстан кейін', eyebrow: '05 / Қайта құру және мәдениет', title: 'Соғыстан кейінгі Қазақстан', description: 'Қалпына келтіру, Ғылым академиясы, әдебиет, өнер және ғалымдарды қудалау тақырыптары қамтылады.' },
  { id: 'facts', label: 'Деректер', eyebrow: '06 / Зерттеу қоры', title: 'Деректен — түсінікке', description: '10 негізгі тезис пен 30 жеке тарихи факт үшін дайындалған құрылым. Мазмұн әлі тексерілмеген.' },
  { id: 'videos', label: 'Бейнебөлім', eyebrow: '07 / Көріп, ой елегінен өткізу', title: 'Тарих экранда', description: 'Үш тақырыптық бейне, қазақша түсіндірме және мәтіндік транскрипт қосу жоспарланған.' },
  { id: 'games', label: 'Ойындар', eyebrow: '08 / Білімді бекіту', title: 'Ойлан. Байланыстыр. Тексер.', description: 'Бес түрлі оқу әрекетінің жоспары. Тапсырмалар мен бағалау логикасы келесі кезеңде қосылады.' },
  { id: 'results', label: 'Нәтиже', eyebrow: '09 / Жеке қорытынды', title: 'Сіздің оқу жолыңыз', description: 'Әр тапсырманың нәтижесі мен жалпы қорытынды осы жерде көрсетілетін болады.' },
  { id: 'sources', label: 'Дереккөздер', eyebrow: '10 / Академиялық ашықтық', title: 'Әр тұжырымның артында — дерек', description: 'Әр тарихи мәлімет, сурет, карта және дұрыс жауап дереккөзге сілтемемен берілуі тиіс.' },
];
export const periods = [
  { id: 'context', years: '1939–1941', title: 'Соғыс алдындағы кезең', note: 'Екінші дүниежүзілік соғыс пен Ұлы Отан соғысының ұғымдарын, уақыт шегін және Қазақстанға қатысты контексті ажырататын материал дайындалады.' },
  { id: 'war', years: '1941–1945', title: 'Майдан және тыл', note: 'Майдан, ерлік, тыл еңбегі және соғыс кезіндегі қоғам туралы деректер қосылады.' },
  { id: 'postwar', years: '1945–1953', title: 'Соғыстан кейін', note: 'Қалпына келтіру, ғылым, мәдениет және саяси қудалау туралы материал қосылады.' },
] as const;
/** Planning labels are editorial tasks, not historical theses or factual claims. */
export const thesisPlan = [
  'Екі соғыстың ұғымы мен кезеңдері', 'Қазақстан және соғыс алдындағы жағдай',
  'Майданға қатысу жолдары', 'Жеке ерлік және тарихи жады',
  'Тыл еңбегі және өндіріс', 'Эвакуация және күнделікті өмір',
  'Соғыстан кейінгі қалпына келтіру', 'Ғылым академиясы және зерттеу',
  'Әдебиет пен өнер', 'Ғалымдарды қудалау және оның салдары',
];
export const activityPlan: { id: ActivityType; number: string; title: string; subtitle: string; method: string; result: string }[] = [
  { id: 'quiz', number: '01', title: 'Дұрыс жауапты таңда', subtitle: 'Көп нұсқалы тест', method: 'Жауап нұсқасын басу немесе пернетақтамен таңдау.', result: 'Дұрыс жауап, түсіндірме, дереккөз және ұпай.' },
  { id: 'matching', number: '02', title: 'Тұлға мен жетістік', subtitle: 'Сәйкестендіру', method: 'Алдымен тұлғаны, кейін жетістікті таңдау. Сүйреу талап етілмейді.', result: 'Әр жұптың дұрыстығы, түсіндірме және ұпай.' },
  { id: 'ordering', number: '03', title: 'Уақытты ретте', subtitle: 'Хронологиялық реттілік', method: 'Оқиғаларды жоғары / төмен батырмаларымен реттеу.', result: 'Дұрыс реттілік, оқиғалардың дереккөзі және ұпай.' },
  { id: 'map', number: '04', title: 'Картадан тап', subtitle: 'Орынды анықтау', method: 'Карта белгісін немесе соған тең мәтіндік тізімдегі орынды таңдау.', result: 'Орын түсіндірмесі, дереккөз және ұпай.' },
  { id: 'classification', number: '05', title: 'Тарихты топтастыр', subtitle: 'Майдан / тыл / соғыстан кейін', method: 'Әр карточкаға үш санаттың бірін батырмамен таңдау.', result: 'Әр санаттың негіздемесі, дереккөз және ұпай.' },
];
export const sectionPlans: Partial<Record<string, string[]>> = {
  front: ['Әскери жолдар мен құрамалар', 'Майданнан келген құжаттар', 'Оқиғалар картасы'],
  heroes: ['11 соғыс қаһарманының өмірбаяны', 'Ерлік пен марапаттың дереккөзі', 'Портрет, автор және мұрағаттық шифр'],
  homefront: ['Өндіріс пен ауыл шаруашылығы', 'Эвакуация және өзара көмек', 'Күнделікті өмір куәліктері'],
  postwar: ['Шаруашылықты қалпына келтіру', 'Ғылым академиясы және ғалымдар', 'Әдебиет пен өнер', 'Ғалымдарды қудалау', 'Соғыстан кейінгі кемінде 4 тұлға'],
};
