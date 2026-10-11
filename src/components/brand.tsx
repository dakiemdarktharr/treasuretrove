export function ChipMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3v5m8-5v5M12 24v5m8-5v5M3 12h5m-5 8h5m16-8h5m-5 8h5M12 13h8m-4 0v7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Brand() {
  return (
    <div className="brand">
      <ChipMark />
      <span>TreasureTrove</span>
      <span className="brand-dot" />
    </div>
  );
}
export function Circuit({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 520 360" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M0 140h96l40 40h66M0 240h70l40-40h92M318 160h70l38-38h94M318 200h40l60 60h102M240 0v100l-20 20v32M280 360v-90l20-20v-32"
          opacity=".3"
        />
        <rect x="202" y="132" width="116" height="96" rx="6" />
        <rect x="216" y="146" width="88" height="68" rx="2" opacity=".25" />
        <path d="M232 164h56m-28 0v31M190 148h12m-12 20h12m-12 20h12m-12 20h12m116-60h12m-12 20h12m-12 20h12m-12 20h12M222 120v12m20-12v12m20-12v12m20-12v12m20-12v12M222 228v12m20-12v12m20-12v12m20-12v12m20-12v12" />
        <path
          d="M74 60h65m34 0h78m-112-8v16m34-16v16m-22-12v8m10-8v8M358 302h30l6-8 8 16 8-16 8 16 8-16 6 8h60"
          opacity=".45"
        />
        <circle cx="96" cy="140" r="4" fill="var(--paper)" />
        <circle cx="426" cy="122" r="4" fill="var(--paper)" />
        <circle cx="70" cy="240" r="4" fill="var(--paper)" />
        <circle cx="76" cy="300" r="18" opacity=".3" />
        <path d="M76 282v36m-18-18h36" opacity=".3" />
      </g>
    </svg>
  );
}
