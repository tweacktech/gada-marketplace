/**
 * Marketplace endpoints (authenticated customer). Responses are returned as the
 * API envelope; the adapters below map resources onto the shapes the existing
 * screens already render, so those screens need no structural changes.
 */
import { apiClient } from './client';

export const naira = (n) =>
  `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export const adaptCategory = (c) => ({
  id: String(c.id),
  slug: c.slug,
  name: c.name,
  icon: c.icon || '🛍️',
});

export const adaptProduct = (p, categoryName = '') => ({
  id: String(p.id),
  vendorId: String(p.vendor_id),
  categoryId: p.category_id != null ? String(p.category_id) : null,
  category: categoryName,
  name: p.name,
  description: p.description || '',
  image: p.image || null,
  price: Number(p.effective_price ?? p.price ?? 0),
  basePrice: Number(p.price ?? 0),
  discountPrice: p.discount_price != null ? Number(p.discount_price) : null,
  unit: p.unit || '',
  isAvailable: !!p.is_available,
  isFavorited: !!p.is_favorited,
});

/** "08:00:00" or "20:00" → "8:00 AM". */
export const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${String(m || 0).padStart(2, '0')} ${suffix}`;
};

export const adaptVendor = (v) => ({
  id: String(v.id),
  slug: v.slug,
  name: v.name,
  category: v.type_label || v.type || '',
  vendorType: v.type,
  rating: Number(v.rating || 0),
  locationName: v.address || '',
  address: v.address || '',
  lat: v.latitude,
  lng: v.longitude,
  minOrder: Number(v.min_order_amount || 0),
  minimumOrder: Number(v.min_order_amount || 0),
  deliveryFee: v.delivery_fee ?? null,
  prepTime: v.prep_time,
  isOpen: !!v.is_open,
  hoursLabel: v.opens_at && v.closes_at
    ? `Open Today: ${formatTime(v.opens_at)} - ${formatTime(v.closes_at)}`
    : null,
  logo: v.logo,
  banner: v.cover_image,
  phone: v.phone,
  isFavorited: !!v.is_favorited,
  isVerified: true,
  menu: [],
});

export const marketplaceApi = {
  /** Live check at checkout time. Throws naming any vendor that is closed. */
  async assertVendorsOpen(vendorIds) {
    const vendors = await Promise.all(vendorIds.map((id) => marketplaceApi.getVendor(id)));
    const closed = vendors.filter((v) => !v.isOpen);
    if (closed.length) {
      const names = closed.map((v) => v.name).join(', ');
      throw new Error(`${names} ${closed.length > 1 ? 'are' : 'is'} closed right now. You can order again when ${closed.length > 1 ? 'they open' : 'it opens'}.`);
    }
  },

  // Public
  async browseCategories() {
    const res = await apiClient.get('/marketplace/browse-categories', undefined, { auth: false });
    return (res.data || []).map(adaptCategory);
  },

  // Vendors (storefronts)
  async getVendors({ type, search } = {}) {
    const res = await apiClient.get('/marketplace/vendors', { type, search });
    return (res.data || []).map(adaptVendor);
  },

  async getNearbyVendors({ latitude, longitude, radius, type }) {
    const res = await apiClient.get('/marketplace/vendors/nearby', { latitude, longitude, radius, type });
    return {
      nearby: (res.data?.nearby || []).map(adaptVendor),
      selectedForYou: (res.data?.selected_for_you || []).map(adaptVendor),
    };
  },

  async getVendorTypes() {
    const res = await apiClient.get('/marketplace/vendors/type');
    return res.data || [];
  },

  async getVendor(vendorId) {
    const res = await apiClient.get(`/marketplace/vendors/${vendorId}`);
    return adaptVendor(res.data);
  },

  /** Returns { categories, products } where each product carries its category name. */
  async getVendorMenu(vendorId) {
    const res = await apiClient.get(`/marketplace/vendors/${vendorId}/menu`);
    const categories = (res.data?.categories || []).map(adaptCategory);
    const nameById = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    const products = (res.data?.all_products || []).map((p) =>
      adaptProduct(p, nameById[String(p.category_id)] || '')
    );
    return { categories, products };
  },

  async getProduct(productId) {
    const res = await apiClient.get(`/marketplace/products/${productId}`);
    return adaptProduct(res.data);
  },

  // Favorites
  async getFavorites(type) {
    const res = await apiClient.get('/marketplace/favorites', { type });
    return res.data;
  },

  async toggleFavorite(type, id) {
    const res = await apiClient.post('/marketplace/favorites/toggle', { type, id: Number(id) });
    return res.data; // { favorited: boolean, ... }
  },

  // Cart (server-side, one cart per customer)
  async getCart() {
    const res = await apiClient.get('/marketplace/cart');
    return res.data;
  },

  async addToCart({ productId, quantity = 1, notes }) {
    const res = await apiClient.post('/marketplace/cart/items', {
      marketplace_product_id: Number(productId),
      quantity,
      notes,
    });
    return res.data;
  },

  async updateCartItem(itemId, quantity) {
    const res = await apiClient.request(`/marketplace/cart/items/${itemId}`, { method: 'PUT', body: { quantity } });
    return res.data;
  },

  async removeCartItem(itemId) {
    const res = await apiClient.request(`/marketplace/cart/items/${itemId}`, { method: 'DELETE' });
    return res.data;
  },

  async clearCart() {
    await apiClient.request('/marketplace/cart', { method: 'DELETE' });
  },

  /** Wallet checkout. Card and transfer need the payment gateway flow, not handled here. */
  async checkout({ deliveryAddress, deliveryLatitude, deliveryLongitude, notes }) {
    const res = await apiClient.post('/marketplace/cart/checkout', {
      payment_method: 'wallet',
      delivery_address: deliveryAddress,
      delivery_latitude: deliveryLatitude,
      delivery_longitude: deliveryLongitude,
      notes,
    });
    return res.data; // { payment_reference, amount, payment_status, orders }
  },

  // Orders
  /** @returns {{ items, nextPage }} — the list is paginated by the server. */
  async getOrders(page = 1) {
    const res = await apiClient.get('/marketplace/orders', { page });
    const body = res.data;
    const items = Array.isArray(body) ? body : body?.data || [];
    const hasNext = !!body?.next_page_url || !!body?.links?.next;
    return { items, nextPage: hasNext ? page + 1 : null };
  },

  async getOrder(orderId) {
    const res = await apiClient.get(`/marketplace/orders/${orderId}`);
    return res.data;
  },

  async getOrderTimeline(orderId) {
    const res = await apiClient.get(`/marketplace/orders/${orderId}/timeline`);
    return res.data;
  },

  async getOrderPin(orderId) {
    const res = await apiClient.get(`/marketplace/order/pin/${orderId}`);
    return res.data;
  },

  async cancelOrder(orderId) {
    const res = await apiClient.request(`/marketplace/orders/${orderId}/cancel`, { method: 'PATCH' });
    return res.data;
  },
};
