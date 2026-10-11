'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { animate, createScope, stagger, svg } from 'animejs';
import { Expand, Shrink } from 'lucide-react';

/** Original axonometric IC study: a little engineering object to take apart. */
export function Assembly({ compact = false }: { compact?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const animationScope = useRef<ReturnType<typeof createScope> | null>(null);
  const [exploded, setExploded] = useState(false);
  const id = useId().replace(/:/g, '');
  useEffect(() => {
    animationScope.current = createScope({ root }).add((self) => {
      self?.add('toggleAssembly', (open: boolean) => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        animate('.chip-lid', {
          translateY: open ? -150 : 0,
          duration: reduced ? 0 : 750,
          ease: 'out(4)',
        });
        animate('.chip-die', {
          translateY: open ? -20 : 0,
          duration: reduced ? 0 : 850,
          ease: 'out(4)',
        });
        animate('.assembly-guides', { opacity: open ? 0.6 : 0, duration: reduced ? 0 : 300 });
        if (open && !reduced)
          animate(svg.createDrawable('.assembly-trace'), {
            draw: ['0 0', '0 1'],
            delay: stagger(45),
            duration: 650,
            ease: 'inOut(3)',
          });
      });
    });
    return () => animationScope.current?.revert();
  }, []);
  useEffect(() => {
    animationScope.current?.methods.toggleAssembly(exploded);
  }, [exploded]);
  return (
    <div ref={root} className={`assembly ${compact ? 'assembly-compact' : ''}`}>
      <svg
        viewBox="0 -60 560 470"
        role="img"
        aria-label="An exploded illustration of an integrated circuit"
      >
        <defs>
          <pattern id={`${id}-dots`} width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".4" />
          </pattern>
          <pattern
            id={`${id}-hatch`}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(30)"
          >
            <path d="M0 0v5" stroke="currentColor" strokeWidth="1" opacity=".5" />
          </pattern>
        </defs>
        <circle cx="283" cy="212" r="157" fill="var(--leaf)" />
        <path d="M410 65a133 133 0 0 1 72 162H350Z" fill={`url(#${id}-dots)`} />
        <path d="m71 268 88-48 215 125-87 48Z" fill={`url(#${id}-dots)`} />
        <g stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <g className="assembly-guides" opacity="0" strokeDasharray="4 5" fill="none">
            <path d="M146 181v-99m274 149v-101M282 306V147M281 101V24" />
          </g>
          <path d="m123 239 157-89 161 93-156 91Z" fill="var(--ink)" opacity=".09" stroke="none" />
          <g fill="var(--paper)">
            {Array.from({ length: 7 }, (_, i) => (
              <g key={i}>
                <path d={`m${154 + i * 17} ${204 + i * 10} -26 15v24l-12 7 8 5 17-10v-22l24-14Z`} />
                <path d={`m${313 + i * 17} ${204 - i * 10} 24 14v24l14 8 8-5-10-6v-25l-25-15Z`} />
              </g>
            ))}
          </g>
          <path d="m146 179 136-78 138 79v48l-138 79-136-79Z" fill="var(--ink)" />
          <path d="m146 179 136 79 138-78-138-79Z" fill="var(--lilac)" />
          <path d="m282 258 138-78v48l-138 79Z" fill={`url(#${id}-hatch)`} />
          <path d="m282 258 138-78v48l-138 79Z" fill="var(--paper)" opacity=".16" />
          <path d="m171 179 111-64 113 65-113 64Z" fill="var(--ink)" />
          <g className="chip-die">
            <path d="m219 180 63-36 64 36v9l-64 36-63-36Z" fill="var(--accent)" />
            <path d="m219 180 63-36 64 36-64 37Z" fill="var(--butter)" />
            <g fill="none" strokeWidth="1">
              <path className="assembly-trace" d="m231 181 50-29 50 29-50 29Z" />
              <path className="assembly-trace" d="m244 181 37-22 37 22-37 21Z" />
              <path className="assembly-trace" d="m259 181 22-13 22 13-22 12Z" />
              {Array.from({ length: 5 }, (_, i) => (
                <path
                  key={i}
                  className="assembly-trace"
                  d={`M${238 + i * 11} ${192 + i * 6}l-22 4 -18 -10M${291 + i * 10} ${210 - i * 6}l24 2 22-13`}
                />
              ))}
            </g>
          </g>
          <g className="chip-lid">
            <path d="m146 171 136-78 138 79v18l-138 79-136-79Z" fill="var(--ink)" />
            <path d="m146 171 136-78 138 79-138 79Z" fill="var(--lilac)" />
            <path d="m158 171 124-71 125 72-125 72Z" fill="none" opacity=".5" />
            <path d="m282 251 138-79v18l-138 79Z" fill={`url(#${id}-hatch)`} />
            <g transform="matrix(.866 .5 -.866 .5 269 135)" stroke="none">
              <text fontFamily="var(--display)" fontSize="30" fontWeight="800" fill="var(--ink)">
                TT—01
              </text>
              <text y="25" fontFamily="var(--mono)" fontSize="11" fill="var(--ink)">
                SMALL PART. BIG IDEA.
              </text>
            </g>
            <ellipse cx="184" cy="176" rx="8" ry="4.5" fill="var(--ink)" stroke="none" />
          </g>
          <g fill="none" opacity=".45" strokeWidth="1">
            <path d="m115 278 153 88m-160-92 13-7m139 104 14-8M444 241l24-14M424 157l44 25m-7-4v52" />
            <path d="M81 124h50l22 14M418 310h50m-8-8 8 8-8 8" />
          </g>
        </g>
        <circle cx="89" cy="169" r="15" fill="var(--accent)" />
        <path d="M83 169h12m-6-6v12" stroke="var(--paper)" strokeWidth="2" />
        <g fontFamily="var(--mono)" fontSize="10" fill="currentColor" opacity=".6">
          <text x="69" y="114">
            EXPLORE THE INSIDE
          </text>
          <text x="451" y="215" transform="rotate(-90 451 215)">
            AXONOMETRIC
          </text>
        </g>
      </svg>
      <button
        type="button"
        className="assembly-toggle"
        aria-pressed={exploded}
        onClick={() => setExploded(!exploded)}
      >
        {exploded ? <Shrink size={15} /> : <Expand size={15} />}{' '}
        {exploded ? 'Put it together' : 'Take it apart'}
      </button>
    </div>
  );
}
