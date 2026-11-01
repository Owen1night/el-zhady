import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={wide ? 'dialog wide' : 'dialog'} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); } }}>
    <div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button type="button" className="icon-button" aria-label="Жабу" onClick={onClose}><X size={22} /></button></div>
    {children}
  </dialog>;
}
