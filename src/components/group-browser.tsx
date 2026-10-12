'use client';
import { useRef, useState, useEffect, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '@/lib/motion-preference';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { GROUPS, FAMILIES, type GroupName, type Part } from '@/lib/inventory';

export function GroupArt({ name, className = '' }: { name: GroupName; className?: string }) {
  const g = GROUPS.find((g) => g.name === name)!;
  return (
    <span
      aria-hidden="true"
      className={`group-art ${className}`}
      style={{
        backgroundImage: `url(/groups/atlas-${g.poster}.webp)`,
        backgroundPosition: `${(g.tile % 2) * 100}% ${Math.floor(g.tile / 2) * 100}%`,
      }}
    />
  );
}

function FamilyRow({
  family,
  parts,
  onOpen,
}: {
  family: string;
  parts: Part[];
  onOpen: (g: GroupName, rect: DOMRect) => void;
}) {
  const groups = GROUPS.filter((g) => g.family === family);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({
    down: false,
    x: 0,
    start: 0,
    moved: false,
    velocity: 0,
    lastX: 0,
    lastTime: 0,
  });
  const [position, setPosition] = useState(0);
  const [max, setMax] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    const node = track.current!;
    const size = () => setMax(Math.max(0, node.scrollWidth - node.clientWidth));
    const observer = new ResizeObserver(size);
    observer.observe(node);
    size();
    return () => observer.disconnect();
  }, []);
  function scroll(amount: number) {
    const node = track.current!;
    node.scrollTo({
      left: Math.max(0, Math.min(max, amount)),
      behavior: reduced ? 'instant' : 'smooth',
    });
  }
  function finish(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    const node = track.current!;
    node.classList.remove('dragging');
    if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId);
    if (d.moved) {
      const card = node.querySelector<HTMLElement>('.group-card')!;
      const step = card.offsetWidth + 24;
      scroll(Math.round((node.scrollLeft - d.velocity * 140) / step) * step);
    }
  }
  return (
    <section className="family-row" aria-label={family}>
      <div className="family-heading">
        <h2>{family}</h2>
        <div className="rail-controls">
          <span className="rail-position">
            {Math.min(
              groups.length,
              Math.round((position / ((track.current?.clientWidth || 1) + 24)) * 4) + 1,
            )}
            –
            {Math.min(
              groups.length,
              Math.round((position / ((track.current?.clientWidth || 1) + 24)) * 4) + 4,
            )}{' '}
            <span>/ {groups.length}</span>
          </span>
          <button
            className="icon-button"
            aria-label={`Previous ${family} groups`}
            disabled={position < 2}
            onClick={() => scroll(position - (track.current!.clientWidth + 24))}
          >
            <ArrowLeft size={17} />
          </button>
          <button
            className="icon-button"
            aria-label={`Next ${family} groups`}
            disabled={position >= max - 2}
            onClick={() => scroll(position + track.current!.clientWidth + 24)}
          >
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
      <div
        ref={track}
        className="group-track"
        onScroll={(e) => setPosition(e.currentTarget.scrollLeft)}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const d = drag.current;
          d.down = true;
          d.x = e.clientX;
          d.start = e.currentTarget.scrollLeft;
          d.moved = false;
          d.velocity = 0;
          d.lastX = e.clientX;
          d.lastTime = performance.now();
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d.down) return;
          const diff = e.clientX - d.x;
          if (Math.abs(diff) > 7) {
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.classList.add('dragging');
          }
          if (d.moved) {
            const now = performance.now();
            d.velocity = (e.clientX - d.lastX) / Math.max(1, now - d.lastTime);
            d.lastX = e.clientX;
            d.lastTime = now;
            e.currentTarget.scrollLeft = d.start - diff;
          }
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const buttons = Array.from(
              e.currentTarget.querySelectorAll<HTMLButtonElement>('.group-card'),
            );
            const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              buttons[
                Math.max(0, Math.min(buttons.length - 1, at + (e.key === 'ArrowRight' ? 1 : -1)))
              ];
            next?.focus({ preventScroll: true });
            if (next) scroll(next.offsetLeft - e.currentTarget.offsetLeft);
          }
        }}
      >
        {groups.map((g) => {
          const count = parts.filter((p) => p.group === g.name).length;
          return (
            <motion.button
              key={g.name}
              className="group-card"
              aria-label={`Open ${g.name} group`}
              data-group={g.slug}
              whileHover={reduced ? undefined : { y: -7 }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              onClick={(e) => onOpen(g.name, e.currentTarget.getBoundingClientRect())}
            >
              <GroupArt name={g.name} />
              <span className="group-label">
                <strong>{g.name}</strong>
                <span>
                  {count}
                  <span className="sr-only"> components</span>
                  <ArrowUpRight size={16} />
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
      {max > 0 && (
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={Math.min(position, max)}
          onChange={(e) => {
            track.current!.scrollLeft = Number(e.target.value);
          }}
          className="rail-scrubber"
          aria-label={`Drag through ${family} groups`}
          style={
            { '--thumb-width': `${Math.max(12, (100 * 4) / groups.length)}%` } as CSSProperties
          }
        />
      )}
    </section>
  );
}

export function GroupBrowser({
  parts,
  onOpen,
}: {
  parts: Part[];
  onOpen: (g: GroupName, rect: DOMRect) => void;
}) {
  return (
    <div className="group-browser">
      {FAMILIES.map((family) => (
        <FamilyRow key={family} family={family} parts={parts} onOpen={onOpen} />
      ))}
    </div>
  );
}
