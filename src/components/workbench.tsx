'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  Search,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownUp,
  LayoutGrid,
  List,
  X,
  Box,
  Zap,
  Radio,
  Cpu,
  Activity,
  ToggleLeft,
  Lightbulb,
  Cable,
  LogOut,
  RefreshCw,
  Check,
  SlidersHorizontal,
  Pencil,
  Trash2,
  MapPin,
  ChevronRight,
  LoaderCircle,
  CornerDownLeft,
} from 'lucide-react';
import { Brand, Circuit, ChipMark } from './brand';
import { GROUPS, searchParts, normalizeId, type Part, type GroupName } from '@/lib/inventory';
import PartForm from './part-form';
import { Modal } from './modal';

const groupIcons = [Zap, Radio, Cpu, Activity, ToggleLeft, Lightbulb, Cable, Box];
const photoUrl = (part: Part) => `/api/parts/${part.id}/photo?v=${part.photoVersion}`;

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
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [sort, setSort] = useState<'id' | 'quantity' | 'recent'>('id');
  const [selectedId, setSelectedId] = useState<string | undefined>(initialPartId);
  const [form, setForm] = useState<'new' | Part | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const pendingRef = useRef(new Set<string>());
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
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4200);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest('input, textarea, select, [contenteditable]');
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        if (document.querySelector('dialog[open]')) return;
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    const pop = () => {
      const match = location.pathname.match(/^\/parts\/([a-f0-9]{24})$/);
      setSelectedId(match?.[1]);
    };
    window.addEventListener('keydown', key);
    window.addEventListener('popstate', pop);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('popstate', pop);
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
      setToast(
        `${part.partId} · ${delta > 0 ? '+' : ''}${delta} ${Math.abs(delta) === 1 ? 'piece' : 'pieces'}`,
      );
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not update stock.');
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
    setToast(`${part.partId} deleted`);
  }
  const searched = searchParts(parts, query);
  const filtered = searched.filter(
    (p) =>
      (query.trim() || group === 'all' || p.group === group) &&
      (stock === 'all' || (stock === 'empty' ? p.quantity === 0 : p.quantity > 0)),
  );
  const visible = [...filtered].sort((a, b) => {
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
  const zeroCount = parts.filter((p) => p.quantity === 0).length;
  const heading = query.trim() ? 'Search results' : group === 'all' ? 'Your components' : group;
  const canCreate =
    !loading &&
    !loadError &&
    query.trim() &&
    !parts.some((p) => normalizeId(p.partId) === normalizeId(query));
  const noGlobalMatch = query.trim() && !searched.length;
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <aside className="sidebar">
          <a href="/" className="brand-link" aria-label="TreasureTrove home">
            <Brand />
          </a>
          <div className="sidebar-body">
            <div className="workspace-caption">
              <span className="workspace-icon">
                <ChipMark size={20} />
              </span>
              <div>
                Personal workbench<small>Component inventory</small>
              </div>
            </div>
            <button
              className={`nav-all ${group === 'all' ? 'active' : ''}`}
              onClick={() => {
                setGroup('all');
                setQuery('');
                setStock('all');
              }}
            >
              <LayoutGrid size={17} />
              <span>All components</span>
              <span className="count">{parts.length}</span>
            </button>
            <div className="sidebar-label">
              By purpose <SlidersHorizontal size={13} />
            </div>
            <nav aria-label="Purpose groups">
              {GROUPS.map((g, i) => {
                const Icon = groupIcons[i];
                return (
                  <button
                    key={g.name}
                    className={`group-link ${group === g.name ? 'active' : ''}`}
                    onClick={() => {
                      setGroup(g.name);
                      setQuery('');
                      setStock('all');
                    }}
                    title={g.hint}
                  >
                    <Icon size={16} strokeWidth={1.6} />
                    <span>{g.name}</span>
                    <span className="count">{parts.filter((p) => p.group === g.name).length}</span>
                  </button>
                );
              })}
            </nav>
            <div className="sidebar-note">
              <div className="trace-line">
                <i />
                <span />
                <i />
              </div>
              <p>
                A little order.
                <br />
                More room to build.
              </p>
            </div>
          </div>
          <div className="account">
            <div className="avatar">{email[0].toUpperCase()}</div>
            <div>
              <strong>My workbench</strong>
              <span title={email}>{email}</span>
            </div>
            <button
              aria-label="Sign out"
              className="icon-button"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                try {
                  const r = await fetch('/api/auth/logout', { method: 'POST' });
                  if (!r.ok) throw new Error();
                  window.location.assign('/login');
                } catch {
                  setToast('Could not sign out. Try again.');
                  setSigningOut(false);
                }
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>
        <main className="workbench">
          <header className="topbar">
            <div>
              <span>Workbench</span>
              <ChevronRight size={13} />
              <strong>Inventory</strong>
            </div>
            <span className="sync-status">
              {loadError ? (
                <>
                  <span className="status-dot offline" /> Connection interrupted
                </>
              ) : pending.size ? (
                <>
                  <LoaderCircle className="spin" size={13} /> Saving
                </>
              ) : (
                <>
                  <span className="status-dot" /> {loading ? 'Connecting' : 'Synced'}
                </>
              )}
            </span>
          </header>
          <div className="workspace-content">
            <div className="page-heading">
              <div>
                <div className="page-overline">
                  <span className="trace-cross">+</span> Your parts, in place.
                </div>
                <h1>{heading}</h1>
                <p>
                  {loading
                    ? 'Opening your collection…'
                    : `${parts.length} ${parts.length === 1 ? 'component' : 'components'} · ${parts.reduce((sum, p) => sum + p.quantity, 0).toLocaleString()} pieces in your collection`}
                </p>
              </div>
              <button className="primary" onClick={() => setForm('new')}>
                <Plus size={17} /> New component
              </button>
            </div>
            <div className="search-area">
              <Search size={22} strokeWidth={1.6} />
              <input
                ref={searchRef}
                aria-label="Search components"
                placeholder="Find a part. An ID, a name, a purpose…"
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
                  <X size={17} />
                </button>
              ) : (
                <kbd>Ctrl K</kbd>
              )}
            </div>
            {query.trim() && (
              <div className="search-context">
                Searching all purpose groups
                {canCreate && !!searched.length && (
                  <button className="text-button" onClick={() => setForm('new')}>
                    <Plus size={13} /> New component “{query.trim()}”
                  </button>
                )}
              </div>
            )}
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
                    {key === 'empty' && zeroCount > 0 && <span>{zeroCount}</span>}
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
                    className={view === 'list' ? 'active' : ''}
                    aria-label="List view"
                    aria-pressed={view === 'list'}
                    onClick={() => setView('list')}
                  >
                    <List size={17} />
                  </button>
                  <button
                    className={view === 'grid' ? 'active' : ''}
                    aria-label="Grid view"
                    aria-pressed={view === 'grid'}
                    onClick={() => setView('grid')}
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </div>
            </div>
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
              <div className="loading-sheet">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n}>
                    <span />
                    <i />
                    <i />
                  </div>
                ))}
              </div>
            ) : !visible.length ? (
              <section className="empty-state">
                {noGlobalMatch ? (
                  <>
                    <div className="empty-search-mark">
                      <Search size={30} strokeWidth={1.2} />
                    </div>
                    <h2>No component matches “{query}”</h2>
                    <p>Add it once. Find it whenever you need it.</p>
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
                    <div className="empty-circuit">
                      <Circuit />
                      <div className="circuit-caption">
                        <span>Input: a component</span>
                        <span>Output: a little order</span>
                      </div>
                    </div>
                    <h2>Your next project starts here.</h2>
                    <p>Give your first component a place on the workbench.</p>
                    <button
                      className="secondary"
                      disabled={!!loadError}
                      onClick={() => setForm('new')}
                    >
                      <Plus size={16} /> Add your first component
                    </button>
                  </>
                ) : (
                  <>
                    <div className="empty-search-mark">
                      <Box size={32} strokeWidth={1.2} />
                    </div>
                    <h2>
                      {stock === 'empty' ? 'Nothing out of stock.' : 'No components here yet.'}
                    </h2>
                    <p>
                      {stock === 'empty'
                        ? 'Your collection is ready to build.'
                        : 'Try another group or add a component.'}
                    </p>
                    <button
                      className="secondary"
                      onClick={() => {
                        setGroup('all');
                        setStock('all');
                        setQuery('');
                      }}
                    >
                      Show all components
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
                      <th className="quantity-heading">Available</th>
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
                            <span className="part-thumb">
                              <img src={photoUrl(part)} alt="" loading="lazy" />
                            </span>
                            <span>
                              <strong>{part.partId}</strong>
                              <span className="part-subtitle">
                                {part.name || part.type || 'Component'}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td>
                          <span
                            className={`purpose-tag group-${GROUPS.findIndex((g) => g.name === part.group)}`}
                          >
                            <span />
                            {part.group}
                          </span>
                          {part.usage && (
                            <span className="usage-preview" title={part.usage}>
                              {part.usage}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="location">{part.location || '—'}</span>
                        </td>
                        <td>
                          <StockControl
                            part={part}
                            pending={pending.has(part.id)}
                            adjust={adjust}
                          />
                        </td>
                        <td>
                          <button
                            className="icon-button open-part"
                            aria-label={`Open ${part.partId}`}
                            onClick={() => select(part)}
                          >
                            <ArrowUpRight size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="parts-grid">
                {visible.map((part) => (
                  <article className="part-card" key={part.id}>
                    <button
                      className="card-open"
                      aria-label={`Open ${part.partId}`}
                      onClick={() => select(part)}
                    >
                      <div className="card-photo">
                        <img src={photoUrl(part)} alt={part.partId} loading="lazy" />
                        <span className="card-open-icon">
                          <ArrowUpRight size={17} />
                        </span>
                      </div>
                      <div className="card-info">
                        <span className="card-group">{part.group}</span>
                        <h3>{part.partId}</h3>
                        <p>{part.name || part.type || 'Component'}</p>
                      </div>
                    </button>
                    <div className="card-bottom">
                      <span>Available</span>
                      <StockControl part={part} pending={pending.has(part.id)} adjust={adjust} />
                    </div>
                  </article>
                ))}
              </div>
            )}
            <footer className="inventory-footer">
              <span>
                <span className="trace-cross">+</span>{' '}
                {visible.length
                  ? `${visible.length} ${visible.length === 1 ? 'component' : 'components'} on your workbench`
                  : 'Everything has its place.'}
              </span>
              <span>
                Search <kbd>/</kbd>
                <span className="footer-divider" /> Open <kbd>↵</kbd>
              </span>
            </footer>
          </div>
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
              setToast(wasNew ? `${part.partId} added to your collection` : 'Component updated');
            }}
          />
        )}
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <Check size={16} />
              <span>{toast}</span>
              <button aria-label="Dismiss notification" onClick={() => setToast('')}>
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
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
    <div className={`stock-control ${part.quantity === 0 ? 'zero' : ''}`}>
      <button
        aria-label={`Use one ${part.partId}`}
        disabled={pending || part.quantity === 0}
        onClick={() => void adjust(part, -1)}
      >
        <Minus size={13} />
      </button>
      <motion.span
        key={part.quantity}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        aria-label={`${part.quantity} available`}
      >
        {part.quantity.toLocaleString()}
      </motion.span>
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
  const amountNumber = Number(amount);
  const valid = Number.isSafeInteger(amountNumber) && amountNumber > 0 && amountNumber <= 1000000;
  return (
    <Modal title="Component details" onClose={onClose} drawer>
      <div className="detail-body">
        <div className="detail-photo">
          <img src={photoUrl(part)} alt={part.name || part.partId} />
          <span className="detail-photo-corner">
            +<br />
            <br />+
          </span>
        </div>
        <div className="detail-title">
          <div>
            <span className="card-group">{part.group}</span>
            <h2>{part.partId}</h2>
            {part.name && <p>{part.name}</p>}
          </div>
          <button className="secondary small" onClick={onEdit}>
            <Pencil size={14} /> Edit
          </button>
        </div>
        <div className="stock-panel">
          <div className="stock-panel-heading">
            <span>Available stock</span>
            <span className={`stock-indicator ${part.quantity ? '' : 'empty'}`}>
              <i />
              {part.quantity ? 'In stock' : 'Out of stock'}
            </span>
          </div>
          <div className="stock-number" aria-live="polite">
            {part.quantity.toLocaleString()}
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
              disabled={pending || !valid || amountNumber > part.quantity}
              onClick={() => void onAdjust(-amountNumber)}
            >
              <Minus size={15} /> Use parts
            </button>
            <button
              className="primary"
              disabled={pending || !valid || amountNumber + part.quantity > 1000000}
              onClick={() => void onAdjust(amountNumber)}
            >
              <Plus size={15} /> Add stock
            </button>
          </div>
          {!valid && <p className="form-error">Enter a whole number from 1 to 1,000,000.</p>}
        </div>
        <dl className="part-metadata">
          <div>
            <dt>Usage</dt>
            <dd>{part.usage || 'No usage added'}</dd>
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
    </Modal>
  );
}
