'use client';
import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import {
  AnimatePresence,
  motion,
  MotionConfig,
  LayoutGroup,
  useReducedMotion,
  useMotionValue,
  useSpring,
} from 'motion/react';
import {
  Search,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownUp,
  LayoutGrid,
  List,
  X,
  LogOut,
  RefreshCw,
  Check,
  Pencil,
  Trash2,
  MapPin,
  LoaderCircle,
  CornerDownLeft,
  ArrowLeft,
  PackageOpen,
  ChevronDown,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Brand, PurposeSymbol } from './brand';
import { Assembly } from './assembly';
import { GROUPS, searchParts, normalizeId, type Part, type GroupName } from '@/lib/inventory';
import PartForm from './part-form';
import { Modal } from './modal';

const shortGroups = [
  'Power',
  'Sensing',
  'Control',
  'Signals',
  'Drive',
  'Light',
  'Connect',
  'Other',
];
const colors = [
  '#e8c969',
  '#b8ccac',
  '#c8b8da',
  '#e8bca3',
  '#c7cbb3',
  '#e7d790',
  '#b7cecb',
  '#ded9ce',
];
const photoUrl = (p: Part) => `/api/parts/${p.id}/photo?v=${p.photoVersion}`;
const groupIndex = (p: Part) => GROUPS.findIndex((g) => g.name === p.group);
const spring = { type: 'spring' as const, stiffness: 340, damping: 30 };

export default function Workbench({
  email,
  initialPartId,
}: {
  email: string;
  initialPartId?: string;
}) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupName | 'all'>('all');
  const [stock, setStock] = useState<'all' | 'available' | 'empty'>('all');
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [sort, setSort] = useState<'id' | 'quantity' | 'recent'>('id');
  const [selectedId, setSelectedId] = useState<string | undefined>(initialPartId);
  const [form, setForm] = useState<'new' | Part | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const pendingRef = useRef(new Set<string>());
  const reduced = useReducedMotion();

  const load = useCallback(async () => {
    if (pendingRef.current.size) return;
    const seq = ++generation.current;
    try {
      const response = await fetch('/api/parts', { cache: 'no-store' });
      if (response.status === 401) {
        window.location.assign('/login');
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (seq === generation.current) {
        setParts(data.parts);
        setLoadError('');
      }
    } catch (e) {
      if (seq === generation.current)
        setLoadError(e instanceof Error ? e.message : 'Could not load inventory.');
    } finally {
      if (seq === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    try {
      const saved = localStorage.getItem('tt-view');
      if (saved === 'grid' || saved === 'list') setView(saved);
    } catch {}
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest('input, textarea, select, [contenteditable]');
      if (e.key === 'Escape') setAccountOpen(false);
      if (document.querySelector('dialog[open]')) return;
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key.toLowerCase() === 'n' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setForm('new');
      }
    };
    const pop = () => setSelectedId(location.pathname.match(/^\/parts\/([a-f0-9]{24})$/)?.[1]);
    window.addEventListener('keydown', key);
    window.addEventListener('popstate', pop);
    window.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('popstate', pop);
      window.removeEventListener('pointerdown', outside);
    };
  }, []);
  function select(part?: Part) {
    setSelectedId(part?.id);
    history.pushState(null, '', part ? `/parts/${part.id}` : '/');
  }
  function updatePart(part: Part) {
    generation.current++;
    setParts((current) =>
      current.some((p) => p.id === part.id)
        ? current.map((p) => (p.id === part.id ? part : p))
        : [...current, part],
    );
  }
  async function adjust(part: Part, delta: number) {
    if (pendingRef.current.has(part.id)) return;
    pendingRef.current.add(part.id);
    setPending(new Set(pendingRef.current));
    generation.current++;
    try {
      const response = await fetch(`/api/parts/${part.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      updatePart(data.part);
      setToast({
        text: `${part.partId}: ${delta > 0 ? '+' : ''}${delta} ${Math.abs(delta) === 1 ? 'piece' : 'pieces'}`,
      });
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : 'Could not update stock.', error: true });
    } finally {
      pendingRef.current.delete(part.id);
      setPending(new Set(pendingRef.current));
      void load();
    }
  }
  async function remove(part: Part) {
    const response = await fetch(`/api/parts/${part.id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    generation.current++;
    setParts((current) => current.filter((p) => p.id !== part.id));
    select();
    setToast({ text: `${part.partId} deleted` });
  }
  function chooseGroup(value: GroupName | 'all') {
    setGroup(value);
    setQuery('');
    setStock('all');
  }
  function chooseView(value: 'list' | 'grid') {
    setView(value);
    try {
      localStorage.setItem('tt-view', value);
    } catch {}
  }
  const searched = searchParts(parts, query);
  const visible = searched
    .filter(
      (p) =>
        (query.trim() || group === 'all' || p.group === group) &&
        (stock === 'all' || (stock === 'empty' ? p.quantity === 0 : p.quantity > 0)),
    )
    .sort((a, b) => {
      const exact = query.trim()
        ? Number(normalizeId(b.partId) === normalizeId(query)) -
          Number(normalizeId(a.partId) === normalizeId(query))
        : 0;
      return (
        exact ||
        (sort === 'quantity'
          ? b.quantity - a.quantity
          : sort === 'recent'
            ? b.updatedAt.localeCompare(a.updatedAt)
            : a.partId.localeCompare(b.partId, undefined, { numeric: true }))
      );
    });
  const selected = parts.find((p) => p.id === selectedId);
  const canCreate =
    !loading &&
    !loadError &&
    query.trim() &&
    !parts.some((p) => normalizeId(p.partId) === normalizeId(query));
  const noGlobalMatch = !!query.trim() && !searched.length;
  const heading = query.trim()
    ? 'Found on the shelf.'
    : group === 'all'
      ? 'The collection.'
      : `${shortGroups[GROUPS.findIndex((g) => g.name === group)]}.`;

  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      <LayoutGroup>
        <div className="app-shell">
          <header className="app-header">
            <a href="/" className="brand-link" aria-label="TreasureTrove home">
              <Brand />
            </a>
            <div className="header-right">
              <span className="sync-status">
                {pending.size ? (
                  <LoaderCircle size={13} className="spin" />
                ) : (
                  <span className={`status-dot ${loadError ? 'offline' : ''}`} />
                )}{' '}
                {loadError
                  ? 'Offline'
                  : pending.size
                    ? 'Saving'
                    : loading
                      ? 'Connecting'
                      : 'All saved'}
              </span>
              <div className="account-menu" ref={accountRef}>
                <button
                  className="account-trigger"
                  aria-label="Account"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen(!accountOpen)}
                >
                  <span className="avatar">{email[0].toUpperCase()}</span>
                  <ChevronDown size={14} />
                </button>
                {accountOpen && (
                  <div className="account-popover">
                    <span>{email}</span>
                    <button
                      disabled={signingOut}
                      onClick={async () => {
                        setSigningOut(true);
                        try {
                          const r = await fetch('/api/auth/logout', { method: 'POST' });
                          if (!r.ok) throw new Error();
                          window.location.assign('/login');
                        } catch {
                          setToast({ text: 'Could not sign out. Try again.', error: true });
                          setSigningOut(false);
                        }
                      }}
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="workbench">
            <section className="collection-heading">
              <div>
                <h1>{heading}</h1>
                <p>
                  {loading ? (
                    'Getting your parts ready…'
                  ) : (
                    <>
                      {parts.length} components <span className="small-dot" />{' '}
                      {parts.reduce((sum, p) => sum + p.quantity, 0).toLocaleString()} pieces in
                      stock
                    </>
                  )}
                </p>
              </div>
              <div className="find-and-add">
                <div className="search-area">
                  <Search size={20} />
                  <input
                    ref={searchRef}
                    aria-label="Search components"
                    placeholder="An ID, a name, an idea…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setStock('all');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setQuery('');
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (noGlobalMatch && canCreate) setForm('new');
                        else if (visible.length === 1) select(visible[0]);
                      }
                    }}
                  />
                  {query ? (
                    <button
                      className="icon-button"
                      aria-label="Clear search"
                      onClick={() => {
                        setQuery('');
                        searchRef.current?.focus();
                      }}
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <kbd>/</kbd>
                  )}
                </div>
                <motion.button
                  className="primary new-button"
                  whileTap={reduced ? undefined : { scale: 0.95 }}
                  onClick={() => setForm('new')}
                >
                  <Plus size={19} /> New component
                </motion.button>
              </div>
            </section>
            <nav className="purpose-rail" aria-label="Purpose groups">
              {[
                { name: 'all', label: 'Everything', hint: 'All components' },
                ...GROUPS.map((g, i) => ({ name: g.name, label: shortGroups[i], hint: g.hint })),
              ].map((g, i) => {
                const active = !query.trim() && group === g.name;
                return (
                  <button
                    key={g.name}
                    className={`purpose-button ${active ? 'active' : ''}`}
                    aria-label={g.name === 'all' ? 'All components' : g.name}
                    aria-pressed={active}
                    title={g.hint}
                    onClick={() => chooseGroup(g.name as GroupName | 'all')}
                    style={
                      { '--token-color': i === 0 ? '#e4dcc5' : colors[i - 1] } as CSSProperties
                    }
                  >
                    {active && (
                      <motion.span
                        layoutId="purpose-selection"
                        className="purpose-selection"
                        transition={spring}
                      />
                    )}
                    <span className={`purpose-shape shape-${i % 4}`}>
                      <PurposeSymbol index={i - 1} />
                    </span>
                    <span className="purpose-label">
                      {g.label}
                      <small>
                        {i === 0 ? parts.length : parts.filter((p) => p.group === g.name).length}
                      </small>
                    </span>
                  </button>
                );
              })}
            </nav>
            <div className="collection-toolbar">
              <div className="stock-tabs" aria-label="Stock filters">
                {(
                  [
                    ['all', 'All parts'],
                    ['available', 'In stock'],
                    ['empty', 'Out of stock'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    className={stock === key ? 'active' : ''}
                    aria-pressed={stock === key}
                    onClick={() => setStock(key)}
                  >
                    {label}
                    {stock === key && (
                      <motion.span layoutId="stock-tab" className="tab-underline" />
                    )}
                  </button>
                ))}
              </div>
              <div className="view-controls">
                <label className="sort-control">
                  <ArrowDownUp size={14} />
                  <select
                    aria-label="Sort components"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                  >
                    <option value="id">Part ID</option>
                    <option value="quantity">Quantity</option>
                    <option value="recent">Recently changed</option>
                  </select>
                </label>
                <div className="view-toggle">
                  <button
                    aria-label="Grid view"
                    aria-pressed={view === 'grid'}
                    className={view === 'grid' ? 'active' : ''}
                    onClick={() => chooseView('grid')}
                  >
                    <LayoutGrid size={17} />
                  </button>
                  <button
                    aria-label="List view"
                    aria-pressed={view === 'list'}
                    className={view === 'list' ? 'active' : ''}
                    onClick={() => chooseView('list')}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>
            {query.trim() && (
              <div className="search-context">
                <span>
                  {searched.length} {searched.length === 1 ? 'match' : 'matches'} across your
                  collection
                </span>
                {canCreate && !!searched.length && (
                  <button className="text-button" onClick={() => setForm('new')}>
                    <Plus size={14} /> Add “{query.trim()}”
                  </button>
                )}
              </div>
            )}
            <div role="status" className="sr-only">
              {loading ? 'Loading inventory' : `${visible.length} components found`}
            </div>
            {loadError && (
              <div className="error-banner" role="alert">
                <span>{loadError}</span>
                <button className="text-button" onClick={() => void load()}>
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            )}
            {loading ? (
              <div className="loading-shelf">
                <LoaderCircle size={28} className="spin" />
                <span>Opening the collection</span>
              </div>
            ) : !visible.length ? (
              <section
                className={`empty-state ${parts.length === 0 && !query ? 'first-part' : ''}`}
              >
                {noGlobalMatch ? (
                  <>
                    <div className="empty-symbol">
                      <Search size={32} />
                    </div>
                    <h2>No component matches “{query}”</h2>
                    <p>A new find? Give it a place in your collection.</p>
                    <button
                      className="primary"
                      disabled={!!loadError}
                      onClick={() => setForm('new')}
                    >
                      <Plus size={17} /> New component <CornerDownLeft size={14} />
                    </button>
                  </>
                ) : parts.length === 0 && group === 'all' && stock === 'all' ? (
                  <>
                    <Assembly compact />
                    <div className="empty-copy">
                      <h2>
                        Every great build
                        <br />
                        starts with a little part.
                      </h2>
                      <p>
                        Add a picture, an ID, and how many you have.
                        <br />
                        We’ll keep a place for the possibilities.
                      </p>
                      <button
                        className="primary"
                        disabled={!!loadError}
                        onClick={() => setForm('new')}
                      >
                        <Plus size={17} /> Add your first component
                      </button>
                      <span className="empty-hint">Or search for a part above to get started.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="empty-symbol">
                      <PackageOpen size={32} />
                    </div>
                    <h2>
                      {stock === 'empty' ? 'Nothing out of stock.' : 'A little room to grow.'}
                    </h2>
                    <p>
                      {stock === 'empty'
                        ? 'Your collection is ready to build.'
                        : 'There are no parts in this selection yet.'}
                    </p>
                    <button className="secondary" onClick={() => chooseGroup('all')}>
                      <ArrowLeft size={15} /> Show all components
                    </button>
                  </>
                )}
              </section>
            ) : view === 'list' ? (
              <div className="table-wrap">
                <table className="parts-table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Purpose</th>
                      <th>Location</th>
                      <th>On hand</th>
                      <th>
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((part) => (
                      <tr key={part.id}>
                        <td>
                          <button className="part-link" onClick={() => select(part)}>
                            <img
                              className="part-thumb"
                              src={photoUrl(part)}
                              alt=""
                              loading="lazy"
                            />
                            <span>
                              <strong>{part.partId}</strong>
                              <span className="part-subtitle">
                                {part.name || part.type || 'Component'}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td>
                          <span className="purpose-tag">
                            <PurposeSymbol index={groupIndex(part)} size={18} />
                            {part.group}
                          </span>
                          {part.usage && <span className="usage-preview">{part.usage}</span>}
                        </td>
                        <td className="location">{part.location || '—'}</td>
                        <td>
                          <StockControl
                            part={part}
                            pending={pending.has(part.id)}
                            adjust={adjust}
                          />
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Open ${part.partId}`}
                            onClick={() => select(part)}
                          >
                            <ArrowUpRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <motion.div layout className="parts-grid">
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.map((part) => (
                    <motion.article
                      layout="position"
                      key={part.id}
                      className="part-card"
                      initial={{ opacity: 0, scale: reduced ? 1 : 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: reduced ? 1 : 0.94 }}
                      transition={spring}
                    >
                      <button
                        className="card-open"
                        aria-label={`Open ${part.partId}`}
                        onClick={() => select(part)}
                      >
                        <div className="card-photo">
                          <motion.img
                            layoutId={`photo-${part.id}`}
                            src={photoUrl(part)}
                            alt={part.partId}
                            loading="lazy"
                            transition={spring}
                          />
                          <span className="card-open-icon">
                            <ArrowUpRight size={18} />
                          </span>
                          {part.quantity === 0 && (
                            <span className="empty-stock-label">Out of stock</span>
                          )}
                        </div>
                        <div className="card-info">
                          <h3>{part.partId}</h3>
                          <p>{part.name || part.type || 'Component'}</p>
                        </div>
                      </button>
                      <div className="card-bottom">
                        <span className="card-purpose" title={part.group}>
                          <PurposeSymbol index={groupIndex(part)} size={16} />
                          {shortGroups[groupIndex(part)]}
                        </span>
                        <StockControl part={part} pending={pending.has(part.id)} adjust={adjust} />
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
            <footer className="inventory-footer">
              <span>
                {visible.length
                  ? `${visible.length} components on the shelf`
                  : 'A place for the things you make.'}
              </span>
              <span>
                <kbd>/</kbd> Search <kbd>N</kbd> New part <kbd>↵</kbd> Open
              </span>
            </footer>
          </main>
          {selectedId &&
            !loading &&
            !form &&
            (selected ? (
              <PartDetail
                key={selected.id}
                part={selected}
                pending={pending.has(selected.id)}
                onClose={() => select()}
                onEdit={() => setForm(selected)}
                onAdjust={(delta) => adjust(selected, delta)}
                onDelete={() => remove(selected)}
              />
            ) : (
              <Modal title="Component not found" onClose={() => select()}>
                <div className="part-form-body">
                  <p>This component isn’t in your inventory.</p>
                  <button className="primary" onClick={() => select()}>
                    Back to inventory
                  </button>
                </div>
              </Modal>
            ))}
          {form && (
            <PartForm
              initialId={query.trim()}
              part={form === 'new' ? undefined : form}
              onClose={() => setForm(null)}
              onSaved={(part) => {
                const wasNew = form === 'new';
                updatePart(part);
                setForm(null);
                setQuery('');
                setGroup('all');
                setStock('all');
                select(part);
                setToast({
                  text: wasNew ? `${part.partId} added to your collection` : 'Component updated',
                });
              }}
            />
          )}
          <AnimatePresence>
            {toast && (
              <motion.div
                className={`toast ${toast.error ? 'toast-error' : ''}`}
                role="status"
                initial={{ opacity: 0, y: reduced ? 0 : 18, scale: reduced ? 1 : 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: reduced ? 0 : 8 }}
              >
                {toast.error ? <X size={17} /> : <Check size={17} />}
                <span>{toast.text}</span>
                <button aria-label="Dismiss notification" onClick={() => setToast(null)}>
                  <X size={15} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}

function Quantity({ value }: { value: number }) {
  const reduced = useReducedMotion();
  return (
    <span className="quantity-window">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: reduced ? 0 : 18, opacity: 0, scale: reduced ? 1 : 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: reduced ? 0 : -18, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 450, damping: 24 }}
        >
          {value.toLocaleString()}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
function StockControl({
  part,
  pending,
  adjust,
}: {
  part: Part;
  pending: boolean;
  adjust: (part: Part, delta: number) => Promise<void>;
}) {
  return (
    <div
      className={`stock-control ${part.quantity === 0 ? 'zero' : ''}`}
      aria-label={`${part.partId} stock`}
    >
      <button
        aria-label={`Use one ${part.partId}`}
        disabled={pending || part.quantity === 0}
        onClick={() => void adjust(part, -1)}
      >
        <Minus size={13} />
      </button>
      <span aria-label={`${part.quantity} available`}>
        <Quantity value={part.quantity} />
      </span>
      <button
        aria-label={`Add one ${part.partId}`}
        disabled={pending || part.quantity >= 1000000}
        onClick={() => void adjust(part, 1)}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
function InspectPhoto({ part }: { part: Part }) {
  const [zoom, setZoom] = useState(false);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 280, damping: 30 });
  const smoothY = useSpring(y, { stiffness: 280, damping: 30 });
  return (
    <div
      className={`detail-photo ${zoom ? 'photo-zoomed' : ''}`}
      onPointerMove={(e) => {
        if (!zoom) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((0.5 - (e.clientX - r.left) / r.width) * r.width * 0.7);
        y.set((0.5 - (e.clientY - r.top) / r.height) * r.height * 0.7);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <motion.img
        layoutId={`photo-${part.id}`}
        src={photoUrl(part)}
        alt={part.name || part.partId}
        style={{ x: reduced ? x : smoothX, y: reduced ? y : smoothY }}
        animate={{ scale: zoom ? 2 : 1 }}
        transition={reduced ? { duration: 0 } : spring}
      />
      <button
        className="inspect-tool icon-button"
        aria-label={zoom ? 'Fit picture' : 'Zoom picture'}
        aria-pressed={zoom}
        title={zoom ? 'Fit picture' : 'Inspect markings'}
        onClick={() => {
          setZoom(!zoom);
          x.set(0);
          y.set(0);
        }}
      >
        {zoom ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
      </button>
    </div>
  );
}
function PartDetail({
  part,
  pending,
  onClose,
  onEdit,
  onAdjust,
  onDelete,
}: {
  part: Part;
  pending: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAdjust: (delta: number) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [amount, setAmount] = useState('1');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const number = Number(amount);
  const valid = Number.isSafeInteger(number) && number > 0 && number <= 1000000;
  return (
    <Modal title="Component details" onClose={onClose} drawer>
      <div className="detail-body">
        <div className="detail-visual">
          <InspectPhoto part={part} />
          <span className="detail-visual-caption">
            <PurposeSymbol index={groupIndex(part)} size={19} />
            {part.group}
          </span>
        </div>
        <div className="detail-information">
          <div className="detail-title">
            <div>
              <h2>{part.partId}</h2>
              {part.name && <p>{part.name}</p>}
            </div>
            <button
              className="icon-button"
              aria-label="Edit component"
              title="Edit component"
              onClick={onEdit}
            >
              <Pencil size={18} />
            </button>
          </div>
          <div className="stock-panel">
            <div className="stock-panel-heading">
              <span>On hand</span>
              <span className={`stock-indicator ${part.quantity ? '' : 'empty'}`}>
                <i />
                {part.quantity ? 'In stock' : 'Out of stock'}
              </span>
            </div>
            <div className="stock-number" aria-live="polite">
              <Quantity value={part.quantity} />
              <span>pieces</span>
            </div>
            <div className="stock-adjust">
              <label className="sr-only" htmlFor="adjust-amount">
                Pieces to add or use
              </label>
              <input
                id="adjust-amount"
                type="number"
                min={1}
                max={1000000}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                className="secondary"
                disabled={pending || !valid || number > part.quantity}
                onClick={() => void onAdjust(-number)}
              >
                <Minus size={15} /> Use parts
              </button>
              <button
                className="primary"
                disabled={pending || !valid || number + part.quantity > 1000000}
                onClick={() => void onAdjust(number)}
              >
                <Plus size={15} /> Add stock
              </button>
            </div>
            {!valid && <p className="form-error">Enter a whole number from 1 to 1,000,000.</p>}
          </div>
          <dl className="part-metadata">
            <div>
              <dt>Usage</dt>
              <dd>{part.usage || 'Not added yet'}</dd>
            </div>
            {part.type && (
              <div>
                <dt>Type</dt>
                <dd>{part.type}</dd>
              </div>
            )}
            {part.location && (
              <div>
                <dt>Location</dt>
                <dd>
                  <MapPin size={14} />
                  {part.location}
                </dd>
              </div>
            )}
            {part.notes && (
              <div>
                <dt>Notes</dt>
                <dd className="notes">{part.notes}</dd>
              </div>
            )}
          </dl>
          <div className="detail-delete">
            {confirming ? (
              <>
                <p>
                  Delete <strong>{part.partId}</strong> and its picture?
                </p>
                <div>
                  <button
                    className="secondary small"
                    disabled={deleting}
                    onClick={() => setConfirming(false)}
                  >
                    Keep component
                  </button>
                  <button
                    className="danger small"
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await onDelete();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Could not delete.');
                        setDeleting(false);
                      }
                    }}
                  >
                    {deleting ? 'Deleting…' : 'Delete component'}
                  </button>
                </div>
                {error && (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                )}
              </>
            ) : (
              <button className="text-button muted" onClick={() => setConfirming(true)}>
                <Trash2 size={14} /> Delete component
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
