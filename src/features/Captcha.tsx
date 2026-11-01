import { useEffect, useRef, useState } from 'react';
import { ErrorNotice } from './Shared';
type Turnstile = { render: (container: HTMLElement, options: { sitekey: string; size: 'compact'; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }) => string; remove: (id: string) => void };
declare global { interface Window { turnstile?: Turnstile } }
let loader: Promise<void> | null = null;
function load() {
  if (window.turnstile) return Promise.resolve();
  if (!loader) loader = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true;
    const timer = setTimeout(() => reject(new Error('Captcha timeout')), 12000);
    script.onload = () => { clearTimeout(timer); resolve(); }; script.onerror = () => { clearTimeout(timer); reject(new Error('Captcha unavailable')); }; document.head.append(script);
  }).catch(error => { loader = null; throw error; });
  return loader;
}
export function Captcha({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null); const [error, setError] = useState(false); const [attempt, setAttempt] = useState(0);
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!sitekey) return;
    let active = true; let widget: string | undefined; setError(false);
    void load().then(() => { if (active && ref.current && window.turnstile) widget = window.turnstile.render(ref.current, { sitekey, size: 'compact', callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => { onToken(''); setError(true); } }); }).catch(() => { if (active) setError(true); });
    return () => { active = false; if (widget) window.turnstile?.remove(widget); };
  }, [sitekey, attempt, onToken]);
  return sitekey ? <div className="captcha-area"><div ref={ref} />{error && <ErrorNotice error="Қауіпсіздік тексеруі жүктелмеді. Қайта көріңіз." retry={() => setAttempt(a => a + 1)} />}</div> : null;
}
