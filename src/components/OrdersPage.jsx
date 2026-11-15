import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Package, ChevronRight } from 'lucide-react';
import { marketplaceApi, naira } from '../api/marketplace';

const ORANGE = '#FF6B00';
const label = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function OrdersPage({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null); // full order + timeline + pin
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await marketplaceApi.getOrders());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const open = async (order) => {
    setBusy(true);
    setError('');
    try {
      const [detail, timeline, pin] = await Promise.all([
        marketplaceApi.getOrder(order.id),
        marketplaceApi.getOrderTimeline(order.id).catch(() => null),
        marketplaceApi.getOrderPin(order.id).catch(() => null),
      ]);
      setSelected({ ...detail, timeline, pin: pin?.pin ?? timeline?.pin ?? null });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this order? Eligible payments are refunded to your wallet.')) return;
    setBusy(true);
    setError('');
    try {
      await marketplaceApi.cancelOrder(selected.id);
      await open({ id: selected.id });
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const wrap = (children) => (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 40px' }}>
      <button onClick={selected ? () => setSelected(null) : onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}>
        <ArrowLeft size={18} /> {selected ? 'All orders' : 'Back'}
      </button>
      {error && <p role="alert" style={{ color: '#B91C1C', background: '#FEF2F2', borderRadius: 10, padding: '10px 12px' }}>{error}</p>}
      {children}
    </div>
  );

  if (selected) {
    const items = selected.items || [];
    const canCancel = !/cancel|complet|deliver/i.test(selected.status || '');
    return wrap(
      <div>
        <h2 style={{ margin: '0 0 4px' }}>Order {selected.order_number}</h2>
        <div style={{ color: '#64748B', fontSize: 14, marginBottom: 14 }}>{label(selected.status)}</div>

        {selected.pin && (
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 14, padding: 14, marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#9A3412' }}>Share this PIN with your rider</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 6, color: ORANGE }}>{selected.pin}</div>
          </div>
        )}

        <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14, marginBottom: 14 }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
              <span>{it.quantity}× {it.product_name}{it.is_custom ? ' (custom)' : ''}</span>
              <span>{it.total_price != null ? naira(it.total_price) : it.status ? label(it.status) : '—'}</span>
            </div>
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Subtotal</span><span>{naira(selected.subtotal)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>Delivery</span><span>{naira(selected.delivery_fee)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: 6 }}><span>Total</span><span>{naira(selected.total)}</span></div>
        </div>

        {selected.timeline?.rider && (
          <div style={{ fontSize: 14, marginBottom: 14, color: '#334155' }}>
            Rider: <strong>{selected.timeline.rider.name}</strong> · {selected.timeline.rider.phone}
          </div>
        )}

        {canCancel && (
          <button onClick={cancel} disabled={busy} style={{ width: '100%', padding: 13, borderRadius: 12, border: '1px solid #FCA5A5', background: '#FFF', color: '#B91C1C', fontWeight: 700, cursor: 'pointer' }}>
            {busy ? 'Working…' : 'Cancel order'}
          </button>
        )}
      </div>
    );
  }

  return wrap(
    <div>
      <h2 style={{ margin: '0 0 14px' }}>My orders</h2>
      {loading && <p style={{ color: '#64748B' }}>Loading orders…</p>}
      {!loading && orders.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: '#64748B', padding: 40 }}><Package size={36} /><p>No orders yet.</p></div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {orders.map((o) => (
          <li key={o.id}>
            <button onClick={() => open(o)} disabled={busy} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10, borderRadius: 14, border: '1px solid #E2E8F0', background: '#FFF', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{o.order_number}</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>{o.vendor?.name} · {label(o.status)}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{naira(o.total)}</div>
              <ChevronRight size={18} color="#94A3B8" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
