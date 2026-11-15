/** Wallet funding, saved cards (authenticated customer). */
import { apiClient } from './client';

// Top-up gateways by provider. Providers without an entry are shown as unavailable.
const GATEWAYS = {
  paystack: '/payment/paystack/gateway',
  flutterwave: '/payment/flutterwave/gateway',
  qorepay: '/payment/qorepay/gateway',
  nomba: '/payment/nomba/gateway',
};

export const adaptCard = (c) => ({
  id: String(c.card_id),
  label: c.label || `${c.brand || 'Card'} •••• ${c.last4 || ''}`.trim(),
  brand: c.brand,
  expMonth: c.exp_month,
  expYear: c.exp_year,
  bank: c.bank,
  isDefault: !!c.is_default,
});

export const paymentsApi = {
  /** @returns {Array<{provider, description, link, method, provider_image}>} */
  async channels() {
    const res = await apiClient.get('/payment/paymentchannels');
    return res.data?.channels || [];
  },

  supportsTopUp(provider) {
    return Boolean(GATEWAYS[String(provider).toLowerCase()]);
  },

  /** Starts a top-up and returns the gateway page to redirect to. */
  async startTopUp(provider, amount) {
    const path = GATEWAYS[String(provider).toLowerCase()];
    if (!path) throw new Error('This payment method is not available yet.');
    const res = await apiClient.post(path, { amount: Number(amount) });
    const d = res.data || {};
    return {
      url: d.url || d.link || d.authorization_url || d.checkout_url || null,
      reference: d.reference || d.reference_id || d.tx_ref || null,
    };
  },

  verifyPayment(reference, channel) {
    return apiClient.post('/payment/verify', { reference_id: reference, payment_channel: channel });
  },

  async listCards() {
    const res = await apiClient.get('/payment/cards');
    return (res.data || []).map(adaptCard);
  },

  /** Starts card tokenisation and returns the gateway page to redirect to. */
  async startAddCard() {
    const res = await apiClient.post('/payment/paystack/addnewcard', {});
    return { url: res.data?.url || null, reference: res.data?.reference || null };
  },

  verifyAddedCard(reference) {
    return apiClient.post('/payment/cards/verify', { reference });
  },

  setDefaultCard(cardId) {
    return apiClient.post('/payment/default/card', { card_id: cardId });
  },

  deleteCard(cardId) {
    return apiClient.request('/payment/delete/card', { method: 'DELETE', body: { card_id: cardId } });
  },

  /** Funds the wallet from a saved card. */
  chargeCard(cardId, amount) {
    return apiClient.post('/payment/fundwallet/card', { card_id: cardId, amount: Number(amount) });
  },
};
