import React from 'react';
import { ArrowLeft, Clock } from 'lucide-react';

/** Placeholder for features that are not live yet. */
export default function ComingSoon({ title, onBack }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: 600, marginBottom: 24 }}>
        <ArrowLeft size={18} /> Back
      </button>
      <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: '40px 24px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFF7ED', color: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Clock size={28} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#FF6B00', letterSpacing: 0.5, marginBottom: 6 }}>COMING SOON</div>
        <h2 style={{ margin: '0 0 8px', color: '#0F172A' }}>{title}</h2>
        <p style={{ margin: 0, color: '#64748B' }}>This service is not available yet. We will let you know when it launches.</p>
      </div>
    </div>
  );
}
