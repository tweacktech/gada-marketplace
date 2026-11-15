import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Bell, Trash2, CheckCheck } from 'lucide-react';
import { notificationApi } from '../api/notifications';
import { useAuth } from '../context/AuthContext';

const ORANGE = '#FF6B00';

const timeAgo = (iso) => {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

export default function NotificationsPage({ onBack, onChanged }) {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const notifyChanged = () => onChanged?.();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationApi.list(1);
      setItems(res.items);
      setNextPage(res.nextPage);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (currentUser) load(); else setLoading(false); }, [load, currentUser]);

  const loadMore = async () => {
    try {
      const res = await notificationApi.list(nextPage);
      setItems((prev) => [...prev, ...res.items]);
      setNextPage(res.nextPage);
    } catch (err) {
      setError(err.message);
    }
  };

  // Optimistic update; roll back on failure by reloading.
  const markRead = async (n) => {
    if (n.isRead) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    try {
      await notificationApi.markRead(n.id);
      notifyChanged();
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      notifyChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    try {
      await notificationApi.remove(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      notifyChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const hasUnread = items.some((x) => !x.isRead);

  if (!currentUser) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 16px', textAlign: 'center', color: '#64748B' }}>
        <Bell size={36} />
        <p>Sign in to see your notifications.</p>
        <button onClick={onBack} style={{ marginTop: 8, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#FF6B00', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 40px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}>
        <ArrowLeft size={18} /> Back
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Notifications</h2>
        {hasUnread && (
          <button onClick={markAll} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: ORANGE, fontWeight: 700, cursor: 'pointer' }}>
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {error && <p role="alert" style={{ color: '#B91C1C', background: '#FEF2F2', borderRadius: 10, padding: '10px 12px' }}>{error}</p>}
      {loading && items.length === 0 && <p style={{ color: '#64748B' }}>Loading notifications…</p>}
      {!loading && items.length === 0 && !error && (
        <div style={{ textAlign: 'center', color: '#64748B', padding: 40 }}><Bell size={36} /><p>You’re all caught up.</p></div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((n) => (
          <li key={n.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, marginBottom: 10, borderRadius: 14, border: '1px solid #E2E8F0', background: n.isRead ? '#FFF' : '#FFF7ED' }}>
            <button onClick={() => markRead(n)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: n.isRead ? 'default' : 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!n.isRead && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: '50%', background: ORANGE, flexShrink: 0 }} />}
                <span style={{ fontWeight: n.isRead ? 600 : 800, color: '#0F172A' }}>{n.title}</span>
              </div>
              {n.body && <div style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>{n.body}</div>}
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>{timeAgo(n.createdAt)}</div>
            </button>
            <button onClick={() => remove(n.id)} aria-label="Delete notification" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}>
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>

      {nextPage && (
        <button onClick={loadMore} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
          Load more
        </button>
      )}
    </div>
  );
}
