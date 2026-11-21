/** Wallet funding and saved cards (authenticated customer). */
import { apiClient } from './client';

export const adaptCard = (c) => ({
  id: String(c.card_id ?? c.id),
  label: c.label || `${c.brand || 'Card'} •••• ${c.last4 || ''}`.trim(),
  brand: c.brand,
  expMonth: c.exp_month,
  expYear: c.exp_year,
  bank: c.bank,
  isDefault: !!c.is_default,
});

/** Lists can come back as a plain array or wrapped in an object. Anything else is an empty list. */
const asList = (body, key) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(body?.data)) return body.data;
  return [];
};

export const paymentsApi = {
  /**
   * Active funding gateways from the server. Each has provider, description, link,
   * method and provider_image; top-up posts to `link` using `method`.
   */
  async channels() {
    const res = await apiClient.get('/payment/paymentchannels');
    return asList(res.data, 'channels');
  },

  /** Starts a top-up on the given channel and returns the gateway page to open. */
  async startTopUp(channel, amount) {
    const method = (channel.method || 'POST').toUpperCase();
    const res = await apiClient.request(channel.link, { method, body: { amount: Number(amount) } });
    const d = res.data || {};
    return {
      url: d.url || d.link || d.authorization_url || d.checkout_url || null,
      reference: d.reference || d.reference_id || d.tx_ref || null,
    };
  },

  verifyPayment(reference, channel) {
    return apiClient.post('/payment/verify', { reference_id: reference, payment_channel: channel });
  },

  /** GET /payment/cards → { count, cards }. Default card comes first. */
  async listCards() {
    const res = await apiClient.get('/payment/cards');
    return asList(res.data, 'cards').map(adaptCard);
  },

  /** POST /payment/paystack/addnewcard — starts a verification charge; the card is saved on callback. */
  async startAddCard() {
    const res = await apiClient.post('/payment/paystack/addnewcard', {});
    return { url: res.data?.url || res.data?.authorization_url || null, reference: res.data?.reference || null };
  },

  /** POST /payment/default/card { card_id } */
  setDefaultCard(cardId) {
    return apiClient.post('/payment/default/card', { card_id: String(cardId) });
  },

  /** DELETE /payment/delete/card { card_id } — resolves to the updated card list. */
  async deleteCard(cardId) {
    const res = await apiClient.request('/payment/delete/card', { method: 'DELETE', body: { card_id: String(cardId) } });
    return asList(res.data, 'cards').map(adaptCard);
  },

  /**
   * POST /payment/fundwallet/card { card_id, amount } — minimum 100, one request every 30 seconds.
   * POST /payment/paystack/chargecard is routed to the same flow, so this is used for both.
   */
  chargeCard(cardId, amount) {
    return apiClient.post('/payment/fundwallet/card', { card_id: String(cardId), amount: Number(amount) });
  },
};
