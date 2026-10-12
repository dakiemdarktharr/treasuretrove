'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useSpring, useScroll, useTransform } from 'motion/react';
import { flushSync } from 'react-dom';
import Lenis from 'lenis';
import { useReducedMotion } from '@/lib/motion-preference';

type Point = { x: number; y: number };
type Transition = (kind: 'iris' | 'pixels', action: () => void, point?: Point) => Promise<void>;
const TransitionContext = createContext<Transition>(async (_, action) => action());
export const useTransition = () => useContext(TransitionContext);

export function Interactions({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const curtain = useRef<HTMLDialogElement>(null);
  const circle = useRef<HTMLDivElement>(null);
  const point = useRef<Point>({ x: 0, y: 0 });
  const busy = useRef(false);
  const cancelPending = useRef(false);
  const [kind, setKind] = useState<'iris' | 'pixels'>('iris');
  useEffect(() => {
    const pointer = (e: PointerEvent) => {
      point.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointerdown', pointer);
    return () => window.removeEventListener('pointerdown', pointer);
  }, []);
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({
      autoRaf: true,
      duration: 0.85,
      smoothWheel: true,
      prevent: (node) => !!node.closest('dialog, [data-lenis-prevent]'),
    });
    const sync = () => (document.querySelector('dialog[open]') ? lenis.stop() : lenis.start());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['open'],
      childList: true,
    });
    return () => {
      observer.disconnect();
      lenis.destroy();
    };
  }, [reduced]);
  const transition: Transition = async (next, action, origin) => {
    if (busy.current) return;
    if (reduced) {
      action();
      return;
    }
    busy.current = true;
    const previous = document.activeElement as HTMLElement | null;
    flushSync(() => setKind(next));
    const node = curtain.current!;
    const p = origin || point.current;
    const x = p.x || innerWidth / 2,
      y = p.y || innerHeight / 2;
    node.style.setProperty('--iris-x', `${x}px`);
    node.style.setProperty('--iris-y', `${y}px`);
    node.showModal();
    try {
      if (next === 'iris') {
        circle.current!.style.clipPath = `circle(0px at ${x}px ${y}px)`;
        await animate(
          circle.current!,
          { clipPath: `circle(${Math.hypot(innerWidth, innerHeight)}px at ${x}px ${y}px)` },
          { duration: 0.23, ease: [0.65, 0, 0.35, 1] },
        );
      } else {
        await Promise.all(
          Array.from(node.querySelectorAll<HTMLElement>('.pixel')).map((el, i) => {
            el.style.opacity = '0';
            return animate(el, { opacity: 1 }, { duration: 0.07, delay: ((i * 17) % 60) / 300 });
          }),
        );
      }
      // Keep the transition in the top layer above newly opened dialogs.
      node.close();
      flushSync(action);
      node.showModal();
      if (next === 'iris') {
        await animate(
          circle.current!,
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { duration: 0.32, ease: [0.65, 0, 0.35, 1] },
        );
      } else {
        await Promise.all(
          Array.from(node.querySelectorAll<HTMLElement>('.pixel')).map((el, i) =>
            animate(el, { opacity: 0 }, { duration: 0.09, delay: ((i * 17) % 60) / 270 }),
          ),
        );
      }
    } finally {
      node.close();
      busy.current = false;
      const top = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1);
      if (top)
        top
          .querySelector<HTMLElement>('input:not([type=file]),button')
          ?.focus({ preventScroll: true });
      else if (previous?.isConnected) previous.focus({ preventScroll: true });
      if (cancelPending.current) {
        cancelPending.current = false;
        top?.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
      }
    }
  };
  return (
    <TransitionContext.Provider value={transition}>
      {children}
      <Pointer />
      <dialog
        ref={curtain}
        className="transition-curtain"
        aria-label="Changing view"
        onCancel={(e) => {
          e.preventDefault();
          cancelPending.current = true;
        }}
      >
        {kind === 'iris' ? (
          <div className="iris-curtain" ref={circle} />
        ) : (
          <div className="pixel-curtain">
            {Array.from({ length: 60 }, (_, i) => (
              <i className="pixel" key={i} />
            ))}
          </div>
        )}
      </dialog>
    </TransitionContext.Provider>
  );
}

export function ScrambleName({ name }: { name: string }) {
  const reduced = useReducedMotion();
  const [text, setText] = useState(name);
  useEffect(() => {
    if (reduced) {
      setText(name);
      return;
    }
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const start = performance.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / 850);
      setText(
        name
          .split('')
          .map((c, i) =>
            i < progress * name.length
              ? c
              : chars[(i * 7 + Math.floor(progress * 35)) % chars.length],
          )
          .join(''),
      );
      if (progress === 1) clearInterval(timer);
    }, 35);
    return () => clearInterval(timer);
  }, [name, reduced]);
  return (
    <span aria-label={name} className="username">
      <span aria-hidden="true">{text}</span>
    </span>
  );
}

// A soft iPad-style cursor becomes the hovered control's shape. Text inputs retain their I-beam.
function Pointer() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useSpring(-100, { stiffness: 550, damping: 38 });
  const y = useSpring(-100, { stiffness: 550, damping: 38 });
  const w = useSpring(12, { stiffness: 550, damping: 38 });
  const h = useSpring(12, { stiffness: 550, damping: 38 });
  const [active, setActive] = useState(false);
  const [magnetic, setMagnetic] = useState(false);
  useEffect(() => {
    if (reduced || !matchMedia('(pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const layer = target.closest('dialog');
      if (
        ref.current &&
        ref.current.dataset.layer !==
          (layer?.ariaLabel || layer?.getAttribute('aria-labelledby') || 'page')
      ) {
        ref.current.hidePopover();
        ref.current.showPopover();
        ref.current.dataset.layer =
          layer?.ariaLabel || layer?.getAttribute('aria-labelledby') || 'page';
      }
      const input = target.closest('input,textarea,select,[contenteditable]');
      setActive(!input);
      const button = target.closest<HTMLElement>('button,a,summary');
      const small = button && !button.matches('.group-card,.card-open') && button.offsetWidth < 280;
      setMagnetic(!!small);
      if (small) {
        const r = button.getBoundingClientRect();
        x.set(r.left + (e.clientX - r.left - r.width / 2) * 0.06);
        y.set(r.top + (e.clientY - r.top - r.height / 2) * 0.06);
        w.set(r.width);
        h.set(r.height);
      } else {
        x.set(e.clientX - 6);
        y.set(e.clientY - 6);
        w.set(12);
        h.set(12);
      }
    };
    const leave = () => setActive(false);
    const down = () =>
      ref.current?.animate([{ scale: '1' }, { scale: '.88' }, { scale: '1' }], { duration: 240 });
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerleave', leave);
    document.addEventListener('pointerdown', down);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('pointerdown', down);
    };
  }, [reduced, x, y, w, h]);
  if (reduced) return null;
  return (
    <motion.div
      ref={ref}
      popover="manual"
      className={`ios-pointer ${magnetic ? 'magnetic' : ''}`}
      aria-hidden="true"
      style={{ x, y, width: w, height: h, opacity: active ? 1 : 0 }}
    />
  );
}

export function RevealFooter({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const y = useTransform(scrollYProgress, [0, 1], [-65, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [0.2, 1]);
  return (
    <footer ref={ref} className="footer-reveal">
      <motion.div className="footer-content" style={reduced ? {} : { y, opacity }}>
        {children}
      </motion.div>
    </footer>
  );
}

export function StockFlight({ value, photo }: { value: number; photo: string }) {
  const last = useRef(value);
  const anchor = useRef<HTMLSpanElement>(null);
  const [flight, setFlight] = useState<{ id: number; delta: number; x: number; y: number } | null>(
    null,
  );
  const reduced = useReducedMotion();
  useEffect(() => {
    const delta = value - last.current;
    last.current = value;
    if (delta && !reduced && anchor.current) {
      const target = anchor.current.getBoundingClientRect();
      const container = anchor.current.closest('.detail-body, .part-card, tr');
      const source = container
        ?.querySelector('.detail-photo img, .card-photo img, .part-thumb')
        ?.getBoundingClientRect();
      setFlight({
        id: performance.now(),
        delta,
        x: source ? source.left + source.width / 2 - target.left : 50,
        y: source ? source.top + source.height / 2 - target.top : -45,
      });
    }
  }, [value, reduced]);
  const adding = (flight?.delta || 0) > 0;
  return (
    <span ref={anchor} className="stock-flight-anchor" aria-hidden="true">
      {flight && (
        <>
          <motion.span
            key={flight.id}
            className="stock-flight"
            initial={{
              x: adding ? flight.x : 0,
              y: adding ? flight.y : 0,
              scale: adding ? 1.5 : 0.25,
              opacity: 0,
            }}
            animate={{
              x: adding ? [flight.x, flight.x / 2, 0] : [0, flight.x / 2, flight.x],
              y: adding
                ? [flight.y, Math.min(flight.y, 0) - 70, 0]
                : [0, Math.min(flight.y, 0) - 70, flight.y],
              scale: adding ? [1.5, 1, 0.25] : [0.25, 1, 1.5],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            onAnimationComplete={() => setFlight(null)}
          >
            <img src={photo} alt="" />
            <b>
              {adding ? '+' : ''}
              {flight.delta}
            </b>
          </motion.span>
          <motion.span
            key={'ring' + flight.id}
            className="stock-arrival"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1.8, opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.3, delay: adding ? 0.5 : 0 }}
          />
        </>
      )}
    </span>
  );
}
