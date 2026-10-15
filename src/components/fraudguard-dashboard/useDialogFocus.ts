"use client";
import { useEffect, useRef } from 'react';

// Shared by modal surfaces so keyboard focus stays inside the topmost dialog.
export function useDialogFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
    (focusable()[0] ?? dialog).focus();
    const handleKey = (event: KeyboardEvent) => {
      const dialogs = Array.from(document.querySelectorAll('[aria-modal="true"]')).filter(el => el.getClientRects().length > 0);
      if (dialogs.at(-1) !== dialog) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === items[0] || !items.includes(document.activeElement as HTMLElement))) { event.preventDefault(); items.at(-1)!.focus(); }
      else if (!event.shiftKey && (document.activeElement === items.at(-1) || !items.includes(document.activeElement as HTMLElement))) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return ref;
}
