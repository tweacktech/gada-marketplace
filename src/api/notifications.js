/** In-app notification inbox (authenticated customer). */
import { apiClient } from './client';

export const adaptNotification = (n) => ({
  id: n.id,
  title: n.title || 'Notification',
  body: n.content || '',
  type: n.notification_type || '',
  meta: n.meta || {},
  isRead: !!n.is_read,
  createdAt: n.created_at,
});

export const notificationApi = {
  /** @returns {{ items, nextPage }} */
  async list(page = 1) {
    const res = await apiClient.get('/account/notifications', { page });
    const body = res.data || {};
    return {
      items: (body.data || []).map(adaptNotification),
      nextPage: body.next_page_url ? (body.current_page || page) + 1 : null,
    };
  },

  async unreadCount() {
    const res = await apiClient.get('/account/notifications/unread-count');
    return Number(res.data?.unread_count || 0);
  },

  async markRead(id) {
    await apiClient.post(`/account/mark-as-read/${id}`);
  },

  async markAllRead() {
    await apiClient.post('/account/notifications/read-all');
  },

  async remove(id) {
    await apiClient.request(`/account/delete-notification/${id}`, { method: 'DELETE' });
  },
};
