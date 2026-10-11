export function TroveMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M5 7h38v12H30v23H18V19H5V7Z" fill="currentColor" />
      <circle cx="36" cy="32" r="9" fill="var(--accent)" />
      <path d="M33 32h6m-3-3v6" stroke="var(--paper)" strokeWidth="2" />
      <path d="M5 25a17 17 0 0 0 9 15V25H5Z" fill="var(--leaf)" />
    </svg>
  );
}
export function Brand() {
  return (
    <div className="brand">
      <TroveMark />
      <span>
        treasure<span>trove</span>
      </span>
    </div>
  );
}
export function PurposeSymbol({ index, size = 30 }: { index: number; size?: number }) {
  const paths = [
    'M4 16h9m6 0h9M13 7v18M19 11v10',
    'M16 5v8m0 6v8M5 16h8m6 0h8M9 9l4 4m6 6 4 4M9 23l4-4m6-6 4-4',
    'M9 9h14v14H9zM12 4v5m8-5v5M12 23v5m8-5v5M4 12h5m-5 8h5m14-8h5m-5 8h5M13 13h6v6h-6z',
    'M3 16c5-20 8 20 13 0s8 20 13 0',
    'M3 22h7m12 0h7M10 22 22 9M10 20v4m12-4v4',
    'M10 21V12a6 6 0 0 1 12 0v9H10Zm2 0v7m8-7v7M4 6l3 3M25 9l3-3M16 1v2',
    'M4 10h7v12H4m24-12h-7v12h7M11 13h10m-10 6h10M4 16H1m27 0h3',
    'm5 10 11-6 11 6v13l-11 6-11-6V10Zm0 0 11 6 11-6M16 16v13',
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {index < 0 ? (
        <>
          <circle cx="10" cy="10" r="5" fill="currentColor" stroke="none" />
          <path d="M19 5h9v10h-9zM5 20h10v9H5z" />
          <path d="m24 19 6 10H18Z" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <path d={paths[index]} />
          {index === 1 && <circle cx="16" cy="16" r="3" />}
        </>
      )}
    </svg>
  );
}
