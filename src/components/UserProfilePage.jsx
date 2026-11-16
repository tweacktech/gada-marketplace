import React, { useEffect, useState } from 'react';
import {
  Wallet, PlusCircle, ArrowUpRight, ArrowDownLeft, MapPin, Package,
  Settings, ShieldCheck, User, LogOut, CheckCircle, Clock, Trash2, Star, Phone, Mail,
  Eye, EyeOff
} from 'lucide-react';
import { authService } from '../services/authService';
import OrdersPage from './OrdersPage';
import WalletPage from './WalletPage';
import { walletApi } from '../api/wallet';
import { marketplaceApi } from '../api/marketplace';

const TabLabel = ({ icon, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
    <span style={{ lineHeight: 1 }}>{icon}</span>
    <span>{children}</span>
  </span>
);

export default function UserProfilePage({
  currentUser,
  onOpenAuth,
  onLogout,
  onUpdateUser,
  onTrackOrder
}) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'wallet' | 'addresses' | 'settings'
  // Live wallet balance, so the header matches the Wallet tab. Refreshed when the tab changes.
  const [liveBalance, setLiveBalance] = useState(null);
  useEffect(() => {
    walletApi.getBalance().then(setLiveBalance).catch(() => {});
  }, [activeTab]);

  // Live order count from the server (first page; "+" when there are more).
  const [orderCount, setOrderCount] = useState(null);
  const [ordersHasMore, setOrdersHasMore] = useState(false);
  useEffect(() => {
    marketplaceApi.getOrders(1)
      .then((r) => { setOrderCount(r.items.length); setOrdersHasMore(!!r.nextPage); })
      .catch(() => {});
  }, [activeTab]);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(10000);
  const [showBalance, setShowBalance] = useState(false);

  // New Address form
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrText, setAddrText] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');

  if (!currentUser) {
    return (
      <div className="main-content" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <div style={{ background: '#FFF', borderRadius: '24px', padding: '40px 24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#FFF4EC', color: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <User size={36} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>Customer Profile</h2>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '8px', lineHeight: 1.5 }}>
            Sign in to access your order delivery history, saved addresses, wallet balance, and real-time logistics tracking.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
            <button
              onClick={() => onOpenAuth('login')}
              className="primary-btn"
              style={{ padding: '12px 28px', fontSize: '14px' }}
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              style={{
                padding: '12px 28px',
                borderRadius: '12px',
                border: '1px solid #CBD5E1',
                background: '#FFF',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleTopup = () => {
    const updated = authService.topupWallet(topupAmount);
    if (updated) {
      onUpdateUser(updated);
    }
    setShowTopupModal(false);
  };

  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!addrText.trim()) return;

    const updated = authService.addAddress({
      label: addrLabel,
      address: addrText.trim(),
      landmark: addrLandmark.trim(),
      isDefault: false
    });
    if (updated) {
      onUpdateUser(updated);
    }
    setAddrText('');
    setAddrLandmark('');
    setShowAddressModal(false);
  };

  const handleDeleteAddress = (id) => {
    const updated = authService.deleteAddress(id);
    if (updated) onUpdateUser(updated);
  };

  const handleSetDefaultAddress = (id) => {
    const updated = authService.setDefaultAddress(id);
    if (updated) onUpdateUser(updated);
  };

  const orders = currentUser.orders || [];
  const transactions = currentUser.transactions || [];
  const addresses = currentUser.addresses || [];

  return (
    <div className="main-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 32px' }}>
      {/* Profile Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '24px',
          padding: '28px',
          color: '#FFF',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#FF6B00',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: '800'
            }}
          >
            {currentUser.avatar || 'CU'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '800' }}>{currentUser.name}</h2>
              <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} /> Verified Customer
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>
              {currentUser.email} • {currentUser.phone}
            </p>
          </div>
        </div>

        {/* Quick Wallet Pill */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '16px 20px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            minWidth: '200px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#CBD5E1', textTransform: 'uppercase', fontWeight: '700' }}>
              Gada Wallet
            </span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
              title={showBalance ? "Hide balance" : "Show balance"}
            >
              {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#FF6B00', marginTop: '2px' }}>
            {showBalance ? `₦${Number(liveBalance ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₦••••••'}
          </div>
          <button
            onClick={() => setActiveTab('wallet')}
            style={{
              marginTop: '8px',
              background: '#FF6B00',
              color: '#FFF',
              fontSize: '12px',
              fontWeight: '700',
              padding: '6px 14px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <PlusCircle size={14} /> Add Money
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs" style={{ marginBottom: '24px' }}>
        <div
          className={`tab-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <TabLabel icon="📦">My Orders{orderCount != null ? ` (${orderCount}${ordersHasMore ? '+' : ''})` : ''}</TabLabel>
        </div>
        <div
          className={`tab-item ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => setActiveTab('wallet')}
        >
          <TabLabel icon="💳">Wallet & Transactions</TabLabel>
        </div>
        <div
          className={`tab-item ${activeTab === 'addresses' ? 'active' : ''}`}
          onClick={() => setActiveTab('addresses')}
        >
          <TabLabel icon="📍">Delivery Addresses ({addresses.length})</TabLabel>
        </div>
        <div
          className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <TabLabel icon="⚙️">Account Info</TabLabel>
        </div>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && <OrdersPage onBack={() => setActiveTab('settings')} />}

      {activeTab === 'wallet' && <WalletPage onBack={() => setActiveTab('orders')} />}

      {activeTab === 'addresses' && (
        <div style={{ background: '#FFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>Saved Delivery Locations</h3>
              <p style={{ fontSize: '12px', color: '#64748B' }}>Choose where our dispatch riders deliver your items.</p>
            </div>
            <button
              onClick={() => setShowAddressModal(true)}
              className="primary-btn"
              style={{ padding: '8px 16px', fontSize: '12px' }}
            >
              <PlusCircle size={14} /> Add New Address
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {addresses.map(addr => (
              <div
                key={addr.id}
                style={{
                  border: addr.isDefault ? '2px solid #FF6B00' : '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '18px',
                  background: addr.isDefault ? '#FFF9F5' : '#FFF',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={16} color="#FF6B00" />
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>{addr.label}</span>
                    </div>
                    {addr.isDefault && (
                      <span style={{ fontSize: '10px', background: '#FF6B00', color: '#FFF', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>
                        Default
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#475569', marginTop: '10px', lineHeight: 1.4 }}>
                    {addr.address}
                  </p>
                  {addr.landmark && (
                    <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                      Landmark: {addr.landmark}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                  {!addr.isDefault ? (
                    <button
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      style={{ fontSize: '12px', color: '#FF6B00', fontWeight: '700' }}
                    >
                      Set as Default
                    </button>
                  ) : <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '700' }}>✓ Active Default</span>}

                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    style={{ color: '#94A3B8', padding: '4px' }}
                    title="Delete Address"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === 'settings' && (
        <div style={{ background: '#FFF', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '24px', maxWidth: '600px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginBottom: '16px' }}>
            Account Information
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '4px' }}>
                Full Name
              </label>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                {currentUser.name}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '4px' }}>
                Email Address
              </label>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                {currentUser.email}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '4px' }}>
                Phone Number
              </label>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                {currentUser.phone}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '20px', marginTop: '10px' }}>
              <button
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '14px',
                  fontWeight: '700',
                  border: '1px solid #FCA5A5',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} /> Sign Out of Gada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="modal-overlay" onClick={() => setShowTopupModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>Top Up Gada Wallet</h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Instant wallet funding for hassle-free order dispatch.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '20px 0' }}>
              {[5000, 10000, 20000, 50000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTopupAmount(amt)}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: topupAmount === amt ? '2px solid #FF6B00' : '1px solid #CBD5E1',
                    background: topupAmount === amt ? '#FFF4EC' : '#FFF',
                    fontWeight: '800',
                    fontSize: '14px',
                    color: topupAmount === amt ? '#FF6B00' : '#0F172A'
                  }}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              onClick={handleTopup}
              className="primary-btn"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '800' }}
            >
              Pay ₦{topupAmount.toLocaleString()} Now
            </button>
          </div>
        </div>
      )}

      {/* Add Address Modal */}
      {showAddressModal && (
        <div className="modal-overlay" onClick={() => setShowAddressModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A' }}>Add Delivery Address</h3>
            <form onSubmit={handleAddAddress} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Address Label
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Home', 'Office', 'Hostel', 'Family'].map(lbl => (
                    <button
                      type="button"
                      key={lbl}
                      onClick={() => setAddrLabel(lbl)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        background: addrLabel === lbl ? '#FF6B00' : '#F1F5F9',
                        color: addrLabel === lbl ? '#FFF' : '#475569'
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Street Address & House / Flat #
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 18, Commercial Avenue, Bodija"
                  value={addrText}
                  onChange={e => setAddrText(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Nearby Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Opposite Bovas Fuel Station"
                  value={addrLandmark}
                  onChange={e => setAddrLandmark(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                className="primary-btn"
                style={{ width: '100%', padding: '12px', marginTop: '8px' }}
              >
                Save Delivery Address
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
