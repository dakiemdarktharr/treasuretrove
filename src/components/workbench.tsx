'use client';
import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import {
  AnimatePresence,
  motion,
  MotionConfig,
  LayoutGroup,
  useMotionValue,
  useSpring,
  useScroll,
  useMotionValueEvent,
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
  CircuitBoard,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { Brand } from './brand';
import { useReducedMotion } from '@/lib/motion-preference';
import { GroupBrowser, GroupArt } from './group-browser';
import { useTransition, ScrambleName, RevealFooter, StockFlight } from './interactions';
import { GROUPS, searchParts, normalizeId, type Part, type GroupName } from '@/lib/inventory';
import PartForm from './part-form';
import { Modal } from './modal';

const photoUrl = (p: Part) => '/api/parts/' + p.id + '/photo?v=' + p.photoVersion;
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
  const [group, setGroup] = useState<GroupName | 'all' | null>(null);
  const [stock, setStock] = useState<'all' | 'available' | 'empty'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<'id' | 'quantity' | 'recent'>('id');
  const [selectedId, setSelectedId] = useState<string | undefined>(initialPartId);
  const [form, setForm] = useState<'new' | Part | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [origin, setOrigin] = useState<DOMRect | undefined>();
  const searchRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const homeY = useRef(0);
  const generation = useRef(0);
  const pendingRef = useRef(new Set<string>());
  const reduced = useReducedMotion();
  const transition = useTransition();
  const { scrollY } = useScroll();
  const lastScroll = useRef(0);
  useMotionValueEvent(scrollY, 'change', (current) => {
    const diff = current - lastScroll.current;
    if (Math.abs(diff) > 7 || current < 100) {
      setHeaderHidden(current > 150 && diff > 0);
      lastScroll.current = current;
    }
  });
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
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    try {
      const saved = localStorage.getItem('tt-view');
      if (saved === 'grid' || saved === 'list') setView(saved);
    } catch {}
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  const goHome = useCallback(() => {
    void transition('pixels', () => {
      setSelectedId(undefined);
      setForm(null);
      setGroup(null);
      setQuery('');
      setStock('all');
      setAccountOpen(false);
      history.pushState(null, '', '/');
    });
  }, [transition]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      const typing = (e.target as HTMLElement).closest('input,textarea,select,[contenteditable]');
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key.toLowerCase() === 'n' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setForm('new');
      }
      if (e.key === 'Escape') {
        setAccountOpen(false);
        setQuery('');
      }
    };
    const pop = () => {
      setSelectedId(location.pathname.match(/^\/parts\/([a-f0-9]{24})$/)?.[1]);
    };
    const outside = (e: PointerEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    };
    window.addEventListener('keydown', key);
    window.addEventListener('popstate', pop);
    window.addEventListener('pointerdown', outside);
    window.addEventListener('tt-home', goHome);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('popstate', pop);
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('tt-home', goHome);
    };
  }, [goHome]);
  function select(part?: Part) {
    const action = () => {
      setSelectedId(part?.id);
      history.pushState(null, '', part ? '/parts/' + part.id : '/');
    };
    if (part) void transition('iris', action);
    else action();
  }
  function openGroup(value: GroupName | 'all', rect?: DOMRect) {
    homeY.current = window.scrollY;
    setOrigin(rect);
    setStock('all');
    setGroup(value);
  }
  function closeGroup() {
    setGroup(null);
    requestAnimationFrame(() => window.scrollTo({ top: homeY.current, behavior: 'instant' }));
  }
  function chooseView(value: 'grid' | 'list') {
    setView(value);
    try {
      localStorage.setItem('tt-view', value);
    } catch {}
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

  const searched = searchParts(parts, query);
  const matchingGroups = query.trim()
    ? GROUPS.filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase()))
    : [];
  const visible = (group ? parts : searched)
    .filter(
      (p) =>
        (!group || group === 'all' || p.group === group) &&
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
  const inventory = (
    <>
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
              {stock === key && <motion.span layoutId="stock-tab" className="tab-underline" />}
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

      <div role="status" className="sr-only">
        {loading ? 'Loading inventory' : visible.length + ' components found'}
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
          <LoaderCircle className="spin" size={24} />
        </div>
      ) : !visible.length ? (
        <div className="catalog-empty">
          <PackageOpen size={30} strokeWidth={1.3} />
          <h3>
            {query && !group
              ? 'No component matches “' + query + '”'
              : stock === 'empty'
                ? 'No out-of-stock components'
                : 'No components yet'}
          </h3>
          {stock !== 'empty' && !group && (
            <button className="primary" disabled={!!loadError} onClick={() => setForm('new')}>
              <Plus size={16} /> New component
            </button>
          )}
        </div>
      ) : view === 'list' ? (
        <div className="table-wrap">
          <table className="parts-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Group</th>
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
                      <img className="part-thumb" src={photoUrl(part)} alt="" loading="lazy" />
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
                      <CircuitBoard size={18} />
                      {part.group}
                    </span>
                    {part.usage && <span className="usage-preview">{part.usage}</span>}
                  </td>
                  <td className="location">{part.location || '—'}</td>
                  <td>
                    <StockControl part={part} pending={pending.has(part.id)} adjust={adjust} />
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
                    {part.quantity === 0 && <span className="empty-stock-label">Out of stock</span>}
                  </div>
                  <div className="card-info">
                    <h3>{part.partId}</h3>
                    <p>{part.name || part.type || 'Component'}</p>
                  </div>
                </button>
                <div className="card-bottom">
                  <span className="card-purpose" title={part.group}>
                    <CircuitBoard size={16} />
                    {part.group}
                  </span>
                  <StockControl part={part} pending={pending.has(part.id)} adjust={adjust} />
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      <LayoutGroup>
        <div className="app-shell catalog-shell">
          <motion.header
            className="app-header"
            animate={{ y: headerHidden && !accountOpen ? '-110%' : '0%' }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            onFocusCapture={() => setHeaderHidden(false)}
          >
            <button onClick={goHome} className="brand-link" aria-label="TreasureTrove home">
              <Brand />
            </button>
            <div className="header-right">
              <button className="text-button header-collection" onClick={() => openGroup('all')}>
                All components <span className="header-count">{parts.length}</span>
              </button>
              <span className="sync-status">
                <span className={'status-dot ' + (loadError ? 'offline' : '')} />
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
                  <ScrambleName name={email.split('@')[0]} />
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
                          await transition('iris', () => window.location.assign('/login'));
                        } catch {
                          setToast({ text: 'Could not sign out. Try again.', error: true });
                          setSigningOut(false);
                        }
                      }}
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.header>
          <div className="catalog-page">
            <main className="workbench">
              <section className="search-hero">
                <div className="search-heading">
                  <h1>Components</h1>
                  <button className="primary" onClick={() => setForm('new')}>
                    <Plus size={18} /> New component
                  </button>
                </div>
                <div className="home-search">
                  <Search size={28} strokeWidth={1.5} />
                  <input
                    ref={searchRef}
                    aria-label="Search components"
                    disabled={loading}
                    placeholder="Find a part, ID, or group"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setStock('all');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setQuery('');
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (matchingGroups.length === 1 && !searched.length)
                          openGroup(matchingGroups[0].name);
                        else if (canCreate && !searched.length) setForm('new');
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
                      <X size={20} />
                    </button>
                  ) : (
                    <kbd>/</kbd>
                  )}
                </div>
                <div className="search-meta">
                  <span>
                    {parts.length} components <span className="small-dot" />{' '}
                    {parts.reduce((s, p) => s + p.quantity, 0).toLocaleString()} pieces
                  </span>
                  <button
                    className="text-button"
                    onClick={() =>
                      document
                        .getElementById('groups')
                        ?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' })
                    }
                  >
                    Browse groups <ArrowDown size={16} />
                  </button>
                </div>
              </section>
              {!query.trim() && loadError && (
                <div className="error-banner" role="alert">
                  <span>{loadError}</span>
                  <button className="text-button" onClick={() => void load()}>
                    <RefreshCw size={14} />
                    Retry
                  </button>
                </div>
              )}
              {query.trim() ? (
                <section className="search-results">
                  {matchingGroups.length > 0 && (
                    <>
                      <div className="results-heading">
                        <h2>
                          Groups <span>{matchingGroups.length}</span>
                        </h2>
                      </div>
                      <div className="matching-groups">
                        {matchingGroups.map((g) => (
                          <button
                            key={g.name}
                            className="group-card"
                            aria-label={`Open ${g.name} group`}
                            onClick={(e) =>
                              openGroup(g.name, e.currentTarget.getBoundingClientRect())
                            }
                          >
                            <GroupArt name={g.name} />
                            <span className="group-label">
                              <strong>{g.name}</strong>
                              <span>{parts.filter((p) => p.group === g.name).length}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="results-heading">
                    <h2>
                      Search results <span>{searched.length}</span>
                    </h2>
                    {canCreate && searched.length > 0 && (
                      <button className="text-button" onClick={() => setForm('new')}>
                        <Plus size={15} /> New “{query.trim()}”
                      </button>
                    )}
                  </div>
                  {inventory}
                </section>
              ) : (
                <section id="groups">
                  <GroupBrowser parts={parts} onOpen={openGroup} />
                </section>
              )}
            </main>
          </div>
          <RevealFooter>
            <Brand />
            <div className="footer-shortcuts">
              <span>
                <kbd>/</kbd> Search
              </span>
              <span>
                <kbd>N</kbd> New component
              </span>
              <span>
                <kbd>Esc</kbd> Back
              </span>
            </div>
            <button
              className="text-button"
              onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' })}
            >
              Back to search <ArrowUp size={17} />
            </button>
          </RevealFooter>
          {group && (
            <Modal
              title={group === 'all' ? 'All components' : group}
              onClose={closeGroup}
              catalog
              origin={origin}
            >
              <div className="group-inventory">
                <div className="group-inventory-heading">
                  {group !== 'all' && <GroupArt name={group} />}
                  <div>
                    <h2>{group === 'all' ? 'All components' : group}</h2>
                    <p>
                      {parts.filter((p) => group === 'all' || p.group === group).length} components
                    </p>
                  </div>
                  <button className="primary" onClick={() => setForm('new')}>
                    <Plus size={16} />
                    New component
                  </button>
                </div>
                {inventory}
              </div>
            </Modal>
          )}
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
                <div className="catalog-empty">
                  <p>This component isn’t in your inventory.</p>
                  <button className="secondary" onClick={() => select()}>
                    Back
                  </button>
                </div>
              </Modal>
            ))}
          {form && (
            <PartForm
              initialId={query.trim()}
              initialGroup={group && group !== 'all' ? group : ''}
              part={form === 'new' ? undefined : form}
              onClose={() => setForm(null)}
              onSaved={(part) => {
                updatePart(part);
                setForm(null);
                setQuery('');
                setStock('all');
                select(part);
                setToast({ text: form === 'new' ? part.partId + ' added' : 'Component updated' });
              }}
            />
          )}
          <AnimatePresence>
            {toast && (
              <motion.div
                popover="manual"
                ref={(node) => {
                  if (node && !node.matches(':popover-open')) node.showPopover();
                }}
                className={'toast ' + (toast.error ? 'toast-error' : '')}
                role={toast.error ? 'alert' : 'status'}
                initial={{ opacity: 0, y: reduced ? 0 : 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
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
      <span className="stock-target" aria-label={`${part.quantity} available`}>
        <StockFlight value={part.quantity} photo={photoUrl(part)} />
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
            <CircuitBoard size={19} />
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
              <StockFlight value={part.quantity} photo={photoUrl(part)} />
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
            {part.usage && (
              <div>
                <dt>Usage</dt>
                <dd>{part.usage}</dd>
              </div>
            )}
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
