import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Plus, Star, Trash2, Wallet } from 'lucide-react';
import { paymentsApi } from '../api/payments';

const ORANGE = '#FF6B00';
const PENDING_TOPUP = 'gada_pending_topup';
const PENDING_CARD = 'gada_pending_card';

const btn = (variant = 'primary') => ({
  padding: '10px 14px',
  borderRadius: 10,
  border: variant === 'ghost' ? '1px solid #E2E8F0' : 'none',
  background: variant === 'primary' ? ORANGE : '#FFF',
  color: variant === 'primary' ? '#FFF' : '#334155',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
});

const section = { background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 16, marginBottom: 16 };

/** Top-up and saved cards. `onChanged` lets the parent refresh the balance. */
export default function WalletFunding({ onChanged }) {
  const [channels, setChannels] = useState([]);
  const [provider, setProvider] = useState('');
  const [amount, setAmount] = useState('');
  const [cards, setCards] = useState([]);
  const [cardAmount, setCardAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCards = useCallback(() => paymentsApi.listCards().then(setCards).catch((e) => setError(e.message)), []);

  // Load channels and cards; then settle any payment or card set-up that was in progress before a redirect.
  useEffect(() => {
    paymentsApi.channels().then((list) => {
      setChannels(list);
      const first = list.find((c) => paymentsApi.supportsTopUp(c.provider));
      if (first) setProvider(first.provider);
    }).catch((e) => setError(e.message));
    loadCards();

    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    const pendingTopUp = JSON.parse(sessionStorage.getItem(PENDING_TOPUP) || 'null');
    const pendingCard = sessionStorage.getItem(PENDING_CARD);
    const settle = async () => {
      try {
        if (pendingCard && (reference === pendingCard || params.get('card_reference') === pendingCard)) {
          await paymentsApi.verifyAddedCard(pendingCard);
          setNotice('Card saved.');
          await loadCards();
        } else if (pendingTopUp && reference && reference === pendingTopUp.reference) {
          await paymentsApi.verifyPayment(reference, pendingTopUp.channel);
          setNotice('Wallet funded successfully.');
          onChanged?.();
        }
      } catch (e) {
        setError(e.message);
      } finally {
        sessionStorage.removeItem(PENDING_TOPUP);
        sessionStorage.removeItem(PENDING_CARD);
        if (reference) window.history.replaceState({}, '', window.location.pathname);
      }
    };
    settle();
  }, [loadCards, onChanged]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const topUp = () => run(async () => {
    const value = Number(amount);
    if (!value || value < 100) throw new Error('Enter an amount of at least ₦100.');
    const { url, reference } = await paymentsApi.startTopUp(provider, value);
    if (!url) throw new Error('Payment page could not be opened. Please try again.');
    sessionStorage.setItem(PENDING_TOPUP, JSON.stringify({ reference, channel: provider }));
    window.location.href = url;
  });

  const addCard = () => run(async () => {
    const { url, reference } = await paymentsApi.startAddCard();
    if (!url) throw new Error('Could not start card set-up. Please try again.');
    if (reference) sessionStorage.setItem(PENDING_CARD, reference);
    window.location.href = url;
  });

  const setDefault = (id) => run(async () => {
    await paymentsApi.setDefaultCard(id);
    await loadCards();
  });

  const removeCard = (id) => run(async () => {
    if (!window.confirm('Remove this card?')) return;
    await paymentsApi.deleteCard(id);
    await loadCards();
  });

  const payWithCard = (id) => run(async () => {
    const value = Number(cardAmount);
    if (!value || value < 100) throw new Error('Enter an amount of at least ₦100.');
    await paymentsApi.chargeCard(id, value);
    setCardAmount('');
    setNotice('Wallet funded from your card.');
    onChanged?.();
  });

  const topUpChannels = channels.filter((c) => paymentsApi.supportsTopUp(c.provider));

  return (
    <div>
      {error && <p role="alert" style={{ color: '#B91C1C', background: '#FEF2F2', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>{error}</p>}
      {notice && <p style={{ color: '#047857', background: '#ECFDF5', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>{notice}</p>}

      <section style={section}>
        <h3 style={{ margin: '0 0 12px', display: 'flex', gap: 8, alignItems: 'center' }}><Wallet size={18} /> Top up wallet</h3>
        {topUpChannels.length === 0 && <p style={{ color: '#64748B', fontSize: 13 }}>No funding methods are available right now.</p>}
        {topUpChannels.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {topUpChannels.map((c) => (
                <button key={c.provider} type="button" onClick={() => setProvider(c.provider)} style={{ ...btn('ghost'), borderColor: provider === c.provider ? ORANGE : '#E2E8F0', color: provider === c.provider ? ORANGE : '#334155' }}>
                  {c.description || c.provider}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                inputMode="numeric"
                placeholder="Amount (₦)"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 15 }}
              />
              <button onClick={topUp} disabled={busy} style={btn()}>{busy ? 'Please wait…' : 'Top up'}</button>
            </div>
          </>
        )}
      </section>

      <section style={section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><CreditCard size={18} /> Saved cards</h3>
          <button onClick={addCard} disabled={busy} style={{ ...btn('ghost'), display: 'flex', gap: 6, alignItems: 'center' }}><Plus size={14} /> Add card</button>
        </div>

        {cards.length === 0 && <p style={{ color: '#64748B', fontSize: 13 }}>No saved cards yet.</p>}
        {cards.map((card) => (
          <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
            <CreditCard size={20} color="#64748B" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {card.label}
                {card.isDefault && <span style={{ marginLeft: 8, fontSize: 11, background: '#DCFCE7', color: '#15803D', borderRadius: 6, padding: '2px 6px' }}>Default</span>}
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                {card.expMonth && card.expYear ? `Expires ${card.expMonth}/${card.expYear}` : ''}{card.bank ? ` · ${card.bank}` : ''}
              </div>
            </div>
            {!card.isDefault && (
              <button onClick={() => setDefault(card.id)} disabled={busy} aria-label="Set as default card" style={{ ...btn('ghost'), padding: 8 }}><Star size={14} /></button>
            )}
            <button onClick={() => removeCard(card.id)} disabled={busy} aria-label="Remove card" style={{ ...btn('ghost'), padding: 8, color: '#B91C1C' }}><Trash2 size={14} /></button>
          </div>
        ))}

        {cards.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              inputMode="numeric"
              placeholder="Amount from saved card (₦)"
              value={cardAmount}
              onChange={(e) => setCardAmount(e.target.value.replace(/\D/g, ''))}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 15 }}
            />
            <button onClick={() => payWithCard((cards.find((c) => c.isDefault) || cards[0]).id)} disabled={busy} style={btn()}>Fund from card</button>
          </div>
        )}
      </section>
    </div>
  );
}
