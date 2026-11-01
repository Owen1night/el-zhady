const messages: Record<string, string> = {
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
