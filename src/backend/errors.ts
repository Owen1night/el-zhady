const messages: Record<string, string> = {
  INSUFFICIENT_QUESTION_BANK: 'Бөлменің барлық кезеңіне қайталанбайтын сұрақ жетпейді. Кезең санын азайтыңыз немесе толық жинақты таңдаңыз. Бастау орындалмады.',
  ROOM_REMOVED: 'Жүргізуші сізді бөлмеден шығарды. Қосылу ашық болса, код пен есім арқылы өзіңіз қайта қосыла аласыз.',
  ROOM_BLOCKED: 'Осы сеанстың осы бөлмеге қайта кіруі бұғатталған.',
  ROOM_DELETED: 'Бөлме біржола жойылған. Ескі код пен QR енді жарамсыз.',
  CLOSE_BEFORE_DELETE: 'Біржола жою үшін алдымен бөлмені жабыңыз.',
  INVALID_LINEUP: '1–3 кезеңді таңдаңыз. Карта мен хронология бір реттен ғана қосылады.',
  INVALID_ROUND: 'Бұл кезеңді қазір бастауға болмайды. Сайыс күйін жаңартыңыз.',
  COMPETITION_STARTED: 'Сайыс басталған. Кезеңдердің арасында да жаңа қатысушылар қосыла алмайды.',
  RESULTS_NOT_READY: 'Барлық кезең аяқталмайынша қорытындыны жариялауға болмайды.',

  QUIZ_NOT_CONFIGURED: 'Викторина дайын емес. Әкімші сұрақтар жинағын таңдауы керек.',
  QUIZ_SCHEDULER_REQUIRED: 'Автоматты жүргізу қызметі бапталмаған. Әкімші Supabase Cron тапсырмасын тексеруі керек.',
  QUIZ_ALREADY_STARTED: 'Сайыс басталған. Сұрақтар жинағын ауыстыруға болмайды.',
  QUIZ_CANCELLED: 'Сайыс тоқтатылған. Жаңа сайыс үшін басқа бөлме дайындаңыз.',
  QUIZ_ALREADY_FINISHED: 'Сайыс аяқталған. Жаңа сайыс үшін басқа бөлме дайындаңыз.',
  QUIZ_NOT_RUNNING: 'Жауап қабылдау аяқталған немесе сайыс әлі басталмаған.',
  QUIZ_RUNNING: 'Сайыс жүріп жатыр. Тоқтату үшін растауы бар сайысты тоқтату әрекетін қолданыңыз.',
  NO_PARTICIPANTS: 'Жүргізушіден басқа кемінде бір қатысушы қосылуы керек.',
  NOT_IN_ROSTER: 'Сіз осы сайыстың бекітілген қатысушылар тізімінде жоқсыз.',
  ANSWER_WINDOW_CLOSED: 'Бұл сұраққа жауап беру уақыты біткен немесе әлі басталмаған.',
  INVALID_QUESTION: 'Сұрақ осы сайысқа тиесілі емес. Күйін жаңартыңыз.',
  INVALID_OPTION: 'Жауап нұсқасы жарамсыз. Сұрақты жаңартыңыз.',

  INVALID_NAME: 'Есім 2–40 таңбадан тұруы керек. Басқару таңбалары мен < > белгілерін қолданбаңыз.',
  INVALID_TITLE: 'Бөлме атауы 2–80 таңбадан тұруы керек.',
  INVALID_ROOM_CODE: 'Бөлме коды 8 таңбадан тұрады: A–F әріптері мен 0–9 сандары.',
  ROOM_NOT_FOUND: 'Бұл кодпен бөлме табылмады. Кодты тексеріңіз.',
  ROOM_CLOSED: 'Бөлме жабылған. Жүргізушіден басқа бөлме кодын сұраңыз.',
  ROOM_LOCKED: 'Қазір жаңа қатысушыларды қабылдау тоқтатылған.',
  ROOM_FULL: 'Бөлмеде бос орын жоқ.',
  REMOVED: 'Жүргізуші сізді осы бөлмеден шығарды.',
  ROOM_ACCESS_DENIED: 'Бөлмеге кіру рұқсаты жоқ немесе қатысу тоқтатылған. Код арқылы қайта тексеріңіз.',
  RATE_LIMITED: 'Әрекет тым жиі қайталанды. Бір минуттан кейін қайта көріңіз.',
  ROOM_CREATE_LIMIT: 'Сағатына 5 бөлмеге дейін дайындауға болады. Кейінірек қайталаңыз.',
  ADMIN_REQUIRED: 'Бұл әрекет тек уәкілетті әкімшіге қолжетімді.',
  REGISTERED_REQUIRED: 'Бұл бөлім үшін тұрақты аккаунтпен кіріңіз.',
  AUTH_REQUIRED: 'Сеансты тексеріп, қайта кіріңіз. Қонақ ретінде қосылуға да болады.',
  TIMEOUT: 'Қызмет уақытында жауап бермеді. Байланысты тексеріп, қайта көріңіз.',
  UNCONFIGURED: 'Аккаунт пен сайыс қызметі әлі бапталмаған. Тарихи бөлімдер ашық.',
  OAUTH_FAILED: 'Google арқылы кіру аяқталмады. Қайта көріңіз немесе сайысқа қонақ ретінде қосылыңыз.',
  CAPTCHA_REQUIRED: 'Қауіпсіздік тексеруін аяқтаңыз.',
  SESSION_STORAGE: 'Кіруді жалғастыру үшін осы браузерде сайт деректерін сақтауға рұқсат беріңіз.',
};
export class ServiceError extends Error {
  code: string;
  constructor(code: string) { super(messages[code] || 'Қызметке қосылу мүмкін болмады. Қайта көріңіз.'); this.code = code; }
}
export function serviceError(error: unknown): ServiceError {
  if (error instanceof ServiceError) return error;
  const e = error as { message?: string; name?: string; status?: number; code?: string } | null;
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') return new ServiceError('TIMEOUT');
  if (e?.status === 429 || e?.code === 'over_request_rate_limit') return new ServiceError('RATE_LIMITED');
  if (e?.message && Object.hasOwn(messages, e.message)) return new ServiceError(e.message);
  return new ServiceError('SERVICE_UNAVAILABLE');
}
export function errorText(error: unknown): string { return serviceError(error).message; }
export async function bounded<T>(promise: PromiseLike<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([Promise.resolve(promise), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new ServiceError('TIMEOUT')), ms); })]); }
  finally { clearTimeout(timer); }
}
