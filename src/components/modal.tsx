'use client';
import { useEffect, useRef, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { animate, motion } from 'motion/react';
import { useReducedMotion } from '@/lib/motion-preference';
import { TroveMark } from './brand';
let scrollLocks = 0;
let originalOverflow = '';
export function Modal({
  children,
  title,
  onClose,
  wide = false,
  drawer = false,
  catalog = false,
  origin,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
  drawer?: boolean;
  catalog?: boolean;
  origin?: DOMRect;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const titleId = useId();
  const reduced = useReducedMotion();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    node?.showModal();
    node?.querySelector<HTMLInputElement>('input:not([type="file"])')?.focus();
    if (scrollLocks++ === 0) originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      node?.close();
      if (--scrollLocks === 0) document.body.style.overflow = originalOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  async function close() {
    if (closing.current) return;
    closing.current = true;
    if (!reduced && panel.current)
      await animate(
        panel.current,
        catalog && origin ? { ...initial, opacity: 0 } : { opacity: 0, scale: 0.97, y: 15 },
        { duration: catalog ? 0.24 : 0.18, ease: [0.32, 0, 0.2, 1] },
      );
    closeRef.current();
    if (panel.current)
      animate(panel.current, { opacity: 1, scale: 1, y: 0, x: 0 }, { duration: 0.15 });
    closing.current = false;
  }
  const initial =
    origin && typeof window !== 'undefined'
      ? {
          x: origin.left + origin.width / 2 - innerWidth / 2,
          y: origin.top + origin.height / 2 - innerHeight / 2,
          scale: origin.width / Math.min(innerWidth - 64, 1260),
          opacity: 0.2,
        }
      : { opacity: 0, scale: 0.94, y: 20, x: 0 };
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${wide ? 'modal-wide' : ''} ${drawer ? 'drawer' : ''} ${catalog ? 'catalog-modal' : ''}`}
      onCancel={(e) => {
        e.preventDefault();
        void close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            void close();
        }
      }}
    >
      <motion.div
        ref={panel}
        className="modal-panel"
        layoutRoot
        initial={reduced ? false : initial}
        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
      >
        <header className="modal-header">
          <button
            className="modal-home icon-button"
            aria-label="TreasureTrove home"
            onClick={() => {
              if (
                document.querySelector('form[data-dirty="yes"]') &&
                !window.confirm('Discard your unsaved changes?')
              )
                return;
              window.dispatchEvent(new Event('tt-home'));
            }}
          >
            <TroveMark size={27} />
          </button>
          <h2 id={titleId}>{title}</h2>
          <span className="escape-hint">
            <kbd>Esc</kbd>
          </span>
          <button className="icon-button" aria-label="Close dialog" onClick={() => void close()}>
            <X size={19} />
          </button>
        </header>
        {children}
      </motion.div>
    </dialog>
  );
}
