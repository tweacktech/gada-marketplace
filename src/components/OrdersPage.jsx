import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Package, ChevronRight, MapPin, Bike, Store, Clock, Check, Phone, RefreshCw } from 'lucide-react';
import { marketplaceApi, naira } from '../api/marketplace';

const ORANGE = '#FF6B00';
const label = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const dateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '');

const card = { background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14, marginBottom: 14 };
const rowTitle = { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#0F172A', marginBottom: 8 };

// Deep link: #orders/GADA-8291
const hashOrderNumber = () => {
  const m = window.location.hash.match(/^#orders\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
};

const TERMINAL = ['completed', 'cancelled'];

const STATUS_TITLE = {
  pending: 'Order Received',
  ongoing: 'Order Received',
  paid: 'Order Confirmed',
  confirmed: 'Order Confirmed',
  preparing: 'Being Prepared',
  on_the_way: 'Out for Delivery',
  completed: 'Delivered',
  cancelled: 'Order Cancelled',
};

const STEP_COPY = {
  pending: 'Order received and logged in dispatch system.',
  ongoing: 'Order received and logged in dispatch system.',
  paid: 'Payment received. Waiting for the merchant to confirm.',
  confirmed: 'Merchant has accepted your order.',
  preparing: 'Merchant is packaging your items.',
  on_the_way: 'Rider is on the way to your destination.',
  completed: 'Package handed over to you.',
};

export default function OrdersPage({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null); // order detail + timeline
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchDetail = useCallback(async (orderId) => {
    const [detail, timeline] = await Promise.all([
      marketplaceApi.getOrder(orderId),
      marketplaceApi.getOrderTimeline(orderId).catch(() => null),
    ]);
    const pin = timeline?.pin ?? null;
    return { ...detail, timeline, pin };
  }, []);

  const openOrder = useCallback(async (orderId) => {
    setBusy(true);
    setError('');
    try {
      const detail = await fetchDetail(orderId);
      setSelected(detail);
      window.history.replaceState(null, '', `#orders/${encodeURIComponent(detail.order_number)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [fetchDetail]);

  const refreshSelected = useCallback(async () => {
    if (!selected) return;
    try {
      setSelected(await fetchDetail(selected.id));
    } catch (err) {
      setError(err.message);
    }
  }, [selected, fetchDetail]);

  const [nextPage, setNextPage] = useState(null);

  const loadList = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await marketplaceApi.getOrders(page);
      setOrders((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
      setNextPage(res.nextPage);
      return res.items;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load the list, then open the order named in the URL (#orders/GADA-8291), if any.
  useEffect(() => {
    loadList().then((list) => {
      const num = hashOrderNumber();
      const match = num && list.find((o) => o.order_number === num);
      if (match) openOrder(match.id);
    });
  }, [loadList, openOrder]);

  // Live updates while the order is still moving.
  const liveId = selected && !TERMINAL.includes(selected.status) ? selected.id : null;
  useEffect(() => {
    if (!liveId) return undefined;
    const t = setInterval(() => { refreshSelected(); }, 30000);
    return () => clearInterval(t);
  }, [liveId, refreshSelected]);

  const closeDetail = () => {
    setSelected(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this order? Eligible payments are refunded to your wallet.')) return;
    setBusy(true);
    setError('');
    try {
      await marketplaceApi.cancelOrder(selected.id);
      await refreshSelected();
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const wrap = (children, wide = false) => (
    <div style={{ maxWidth: wide ? 1100 : 720, margin: '0 auto', padding: '20px 16px 40px' }}>
      <button onClick={selected ? closeDetail : onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}>
        <ArrowLeft size={18} /> {selected ? 'All orders' : 'Back'}
      </button>
      {error && <p role="alert" style={{ color: '#B91C1C', background: '#FEF2F2', borderRadius: 10, padding: '10px 12px' }}>{error}</p>}
      {children}
    </div>
  );

  if (selected) {
    const tl = selected.timeline || {};
    const steps = tl.steps || [];
    const completedCount = steps.filter((s) => s.completed).length;
    const percent = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;
    const firstPending = steps.findIndex((s) => !s.completed);
    const rider = tl.rider || selected.rider;
    const vendor = selected.vendor || {};
    const cancelled = selected.status === 'cancelled';
    const canCancel = !TERMINAL.includes(selected.status);
    const title = STATUS_TITLE[selected.status] || label(selected.status);

    return wrap(
      <div>
        {/* Header */}
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}><Bike size={22} /></div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: ORANGE, letterSpacing: 0.5 }}>LIVE DELIVERY TRACKING · {selected.order_number}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: cancelled ? '#B91C1C' : '#15803D' }}>{title}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ padding: '8px 14px', borderRadius: 12, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#15803D', fontWeight: 800, fontSize: 13 }}>{label(selected.status)}</span>
            <button onClick={refreshSelected} aria-label="Refresh" style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid #E2E8F0', background: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={16} /></button>
          </div>
        </div>

        {/* Route progress */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Store size={14} /> {vendor.name || 'Merchant'}</span>
            <span style={{ color: '#15803D' }}>{percent}% {percent === 100 ? '(Delivered)' : ''}</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><MapPin size={14} /> {(selected.delivery_address || '').split(',')[0] || 'Destination'}</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden' }}>
            <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg,#FF6B00,#22C55E)', transition: 'width .4s' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, alignItems: 'start' }}>
          {/* Timeline */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Live Logistics Timeline</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>Real-time status updates</div>
              </div>
              {steps.length > 0 && <span style={{ fontSize: 12, fontWeight: 800, color: '#0B4FD8', background: '#EFF6FF', borderRadius: 999, padding: '4px 10px' }}>Stage {Math.max(completedCount, 1)} of {steps.length}</span>}
            </div>

            {steps.length === 0 && <div style={{ fontSize: 13, color: '#64748B' }}>No updates yet.</div>}
            {steps.map((step, i) => {
              const done = step.completed;
              const current = !done && i === firstPending;
              const pillText = done ? (i === steps.length - 1 ? 'Completed' : 'Confirmed') : current ? 'In Progress' : 'Pending';
              const pillColor = done ? '#15803D' : current ? '#0B4FD8' : '#94A3B8';
              return (
                <div key={step.status} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: i < steps.length - 1 ? 18 : 0 }}>
                  {i < steps.length - 1 && <div style={{ position: 'absolute', left: 17, top: 36, bottom: 0, width: 2, background: done ? '#4ADE80' : '#E2E8F0' }} />}
                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: done ? '#4ADE80' : current ? '#DBEAFE' : '#F1F5F9', color: done ? '#FFF' : current ? '#0B4FD8' : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    {done ? <Check size={18} /> : <Clock size={16} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: '#0F172A' }}>{step.label || label(step.status)}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: pillColor, whiteSpace: 'nowrap' }}>{pillText}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{STEP_COPY[step.status] || ''}</div>
                    {step.reached_at && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{dateTime(step.reached_at)}</div>}
                  </div>
                </div>
              );
            })}

            {(tl.other_events || []).length > 0 && (
              <div style={{ marginTop: 14, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                {tl.other_events.map((e, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#475569', padding: '4px 0' }}>{e.label} · {dateTime(e.reached_at)}</div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', letterSpacing: 0.5, marginBottom: 12 }}>ASSIGNED DELIVERY RIDER</div>
              {rider ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FFF7ED', color: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bike size={22} /></div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>{rider.name}</div>
                      {rider.current_location && <div style={{ fontSize: 13, color: '#64748B' }}>{rider.current_location}</div>}
                    </div>
                  </div>
                  {rider.phone && (
                    <a href={`tel:${rider.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 12, background: '#15803D', color: '#FFF', fontWeight: 800, textDecoration: 'none' }}>
                      <Phone size={16} /> Call rider
                    </a>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 13, color: '#64748B' }}>A rider will be assigned once your order is ready.</div>
              )}
            </div>

            <div style={card}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>Order Summary & Routing</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <Store size={18} color="#0B4FD8" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Merchant hub</div>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{vendor.name || '—'}</div>
                  {vendor.address && <div style={{ fontSize: 13, color: '#64748B' }}>{vendor.address}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <MapPin size={18} color={ORANGE} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Customer destination</div>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>{selected.delivery_address || '—'}</div>
                </div>
              </div>

              {selected.pin && (
                <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: 12, textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#9A3412' }}>Handover PIN for your rider</div>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 6, color: ORANGE }}>{selected.pin}</div>
                </div>
              )}

              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
                {(selected.items || []).map((it) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: '#334155' }}>
                    <span>{it.quantity}× {it.product_name}{it.is_custom ? ' (custom)' : ''}</span>
                    <span>{it.total_price != null ? naira(it.total_price) : ''}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: '#64748B' }}><span>Delivery</span><span>{naira(selected.delivery_fee)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontWeight: 700, color: '#334155' }}>Total paid</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: '#0F172A' }}>{naira(selected.total)}</span>
                </div>
              </div>
            </div>

            {canCancel && (
              <button onClick={cancel} disabled={busy} style={{ width: '100%', padding: 13, borderRadius: 12, border: '1px solid #FCA5A5', background: '#FFF', color: '#B91C1C', fontWeight: 700, cursor: 'pointer' }}>
                {busy ? 'Working…' : 'Cancel order'}
              </button>
            )}
          </div>
        </div>
      </div>,
      true
    );
  }

  return wrap(
    <div>
      <h2 style={{ margin: '0 0 14px' }}>Order history</h2>
      {loading && orders.length === 0 && <p style={{ color: '#64748B' }}>Loading orders…</p>}
      {!loading && orders.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: '#64748B', padding: 40 }}><Package size={36} /><p>No orders yet.</p></div>
      )}
      {orders.map((o) => (
        <OrderHistoryCard key={o.id} order={o} onTrack={() => openOrder(o.id)} disabled={busy} />
      ))}
      {nextPage && (
        <button onClick={() => loadList(nextPage)} disabled={loading} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}

const STATUS_PILL = {
  completed: { text: 'Delivered', bg: '#ECFDF5', color: '#15803D' },
  cancelled: { text: 'Cancelled', bg: '#FEF2F2', color: '#B91C1C' },
};

const whenLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const day = sameDay(d, today) ? 'Today' : sameDay(d, yesterday) ? 'Yesterday' : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  return `${day}, ${d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}`;
};

function OrderHistoryCard({ order: o, onTrack, disabled }) {
  const pill = STATUS_PILL[o.status] || { text: label(o.status), bg: '#FFF7ED', color: '#C2410C' };
  const footer = [
    o.vendor?.name && ['Store Hub', o.vendor.name],
    o.agent?.name && ['Store Agent', o.agent.name],
    o.rider?.name && ['Assigned Rider', o.rider.name],
  ].filter(Boolean);

  return (
    <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Order #{o.order_number}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: pill.color, background: pill.bg, borderRadius: 999, padding: '3px 10px' }}>{pill.text}</span>
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            {whenLabel(o.created_at)}{o.delivery_address ? ` • Delivered to: ${o.delivery_address}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Total Paid</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: ORANGE }}>{naira(o.total)}</div>
        </div>
        <button onClick={onTrack} disabled={disabled} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: ORANGE, color: '#FFF', fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 16px rgba(255,107,0,0.25)' }}>
          Track Order
        </button>
      </div>

      {(o.items || []).length > 0 && (
        <>
          <div style={{ borderTop: '1px solid #F1F5F9', margin: '14px 0 12px' }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Items Ordered:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {o.items.map((it) => (
              <span key={it.id} style={{ fontSize: 13, color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: 10, padding: '6px 10px' }}>
                <strong style={{ color: ORANGE }}>{it.quantity}×</strong> {it.product_name}{it.is_custom ? ' (custom)' : ''}
              </span>
            ))}
          </div>
        </>
      )}

      {footer.length > 0 && (
        <div style={{ marginTop: 12, background: '#F8FAFC', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#64748B', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
          <MapPin size={14} color={ORANGE} style={{ alignSelf: 'center' }} />
          {footer.map(([k, v], i) => (
            <span key={k}>
              {k}: <strong style={{ color: '#0F172A' }}>{v}</strong>{i < footer.length - 1 ? ' •' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
