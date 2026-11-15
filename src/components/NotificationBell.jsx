import React, { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { notificationApi } from '../api/notifications';

const POLL_MS = 60000;

/**
 * Bell icon with unread badge. Polls the unread count while mounted and when
 * the tab regains focus. Pass `refreshKey` to force a refresh after changes.
 */
export default function NotificationBell({ onOpen, refreshKey }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    notificationApi.unreadCount().then(setCount).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh, refreshKey]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}
      style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#0F172A' }}
    >
      <Bell size={22} />
      {count > 0 && (
        <span style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, background: '#FF6B00', color: '#FFF', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
