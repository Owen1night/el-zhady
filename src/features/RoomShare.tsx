import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, QrCode } from 'lucide-react';
import { siteUrl } from '../backend/config';
import { joinUrl } from '../lib/navigation';
import { ErrorNotice } from './Shared';
export function RoomShare({ code }: { code: string }) {
  const url = joinUrl(siteUrl, code); const [qr, setQr] = useState(''); const [failed, setFailed] = useState(false); const [retry, setRetry] = useState(0); const [message, setMessage] = useState('');
  useEffect(() => { let active = true; setFailed(false); void QRCode.toDataURL(url, { width: 200, margin: 2, color: { dark: '#292925', light: '#ffffff' } }).then(value => { if (active) setQr(value); }).catch(() => { if (active) setFailed(true); }); return () => { active = false; }; }, [url, retry]);
  return <section className="room-share"><div><span className="eyebrow">АЛДЫН АЛА БӨЛІСУ</span><h2><QrCode size={24} /> Бөлменің сілтемесі</h2><p>Бөлме коды сілтемеге енгізілген. Қатысушы есімін өзі таңдайды.</p><a className="join-url" href={url}>{url}</a><button type="button" className="button secondary" onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage('Сілтеме көшірілді.'); } catch { setMessage('Көшіру қолжетімсіз. Сілтемені жоғарыдағы мәтіннен көшіріңіз.'); } }}><Copy size={16} /> Сілтемені көшіру</button><p className="form-help" role="status">{message}</p></div>{qr && <img src={qr} width={200} height={200} alt="Бөлмеге қосылу QR-коды" />}{failed && <ErrorNotice error="QR-код жасалмады. Мәтіндік сілтеме қолжетімді." retry={() => setRetry(r => r + 1)} />}</section>;
}
