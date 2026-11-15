import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Wallet, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { walletApi } from '../api/wallet';
import { naira } from '../api/marketplace';
import WalletFunding from './WalletFunding';

const ORANGE = '#FF6B00';

export default function WalletPage({ onBack }) {
  const [info, setInfo] = useState(null);
  const [filters, setFilters] = useState([]);
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTransactions = useCallback(async (f, page = 1) => {
    const res = await walletApi.getTransactions({ filter: f, page });
    setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
    setNextPage(res.nextPage);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [walletInfo, filterList] = await Promise.all([walletApi.getWalletInfo(), walletApi.getFilters()]);
      setInfo(walletInfo);
      setFilters(filterList);
      await loadTransactions(filter, 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, loadTransactions]);

  useEffect(() => { load(); }, [load]);

  const changeFilter = async (f) => {
    setFilter(f);
    setError('');
    try {
      await loadTransactions(f, 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadMore = async () => {
    try {
      await loadTransactions(filter, nextPage);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 40px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 600, marginBottom: 12 }}>
        <ArrowLeft size={18} /> Back
      </button>

      <div style={{ background: 'linear-gradient(135deg,#0B132B,#1E293B)', color: '#FFF', borderRadius: 20, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: 0.85 }}><Wallet size={18} /> Wallet balance</span>
          <button onClick={load} aria-label="Refresh" style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: 6, color: '#FFF', cursor: 'pointer' }}>
            <RefreshCw size={16} />
          </button>
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, margin: '8px 0 14px' }}>{info ? naira(info.balance) : '—'}</div>
        {info?.virtualAccount && (
          <div style={{ fontSize: 13, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px' }}>
            Fund with a transfer to <strong>{info.virtualAccount.accountNumber}</strong> ({info.virtualAccount.bankName})
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <WalletFunding onChanged={load} />
      </div>

      {error && <p role="alert" style={{ color: '#B91C1C', background: '#FEF2F2', borderRadius: 10, padding: '10px 12px', marginTop: 14 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '18px 0 10px', paddingBottom: 4 }}>
        {['', ...filters].map((f) => (
          <button
            key={f || 'all'}
            onClick={() => changeFilter(f)}
            style={{ whiteSpace: 'nowrap', padding: '7px 14px', borderRadius: 999, border: '1px solid #E2E8F0', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: filter === f ? ORANGE : '#FFF', color: filter === f ? '#FFF' : '#334155' }}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {loading && items.length === 0 && <p style={{ color: '#64748B' }}>Loading transactions…</p>}
      {!loading && items.length === 0 && !error && <p style={{ color: '#64748B' }}>No transactions yet.</p>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((t, i) => {
          const credit = t.type === 'credit' || t.amount > 0 && !/debit|withdraw|payment/i.test(t.type || '');
          return (
            <li key={`${t.id}-${i}`} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 4px', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: credit ? '#ECFDF5' : '#FEF2F2', color: credit ? '#047857' : '#B91C1C' }}>
                {credit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{t.date ? new Date(t.date).toLocaleString('en-NG') : ''}{t.status ? ` · ${t.status}` : ''}</div>
              </div>
              <div style={{ fontWeight: 700, color: credit ? '#047857' : '#0F172A' }}>{naira(Math.abs(t.amount))}</div>
            </li>
          );
        })}
      </ul>

      {nextPage && (
        <button onClick={loadMore} style={{ width: '100%', marginTop: 14, padding: 12, borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
          Load more
        </button>
      )}
    </div>
  );
}
