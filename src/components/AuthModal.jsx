import React, { useEffect, useRef, useState } from 'react';
import { X, Eye, EyeOff, Phone, Lock, User, Mail, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isValidPhone, normalizePhone } from '../api/customerAuth';

const ORANGE = '#FF6B00';
const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign-in is the default tab; 'register' is accepted for older callers.
const normalizeMode = (m) => (m === 'register' || m === 'signup' ? 'signup' : 'login');

const inputBase = {
  width: '100%',
  padding: '12px 42px 12px 40px',
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#FFF',
};

const primaryBtn = (disabled) => ({
  width: '100%',
  padding: 14,
  borderRadius: 12,
  border: 'none',
  background: disabled ? '#FDBA74' : ORANGE,
  color: '#FFF',
  fontWeight: 700,
  fontSize: 15,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 6,
});

function Field({ icon: Icon, label, trailing, ...inputProps }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
        {label}
      </span>
      <div style={{ position: 'relative' }}>
        <Icon size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input {...inputProps} style={inputBase} />
        {trailing && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>{trailing}</div>
        )}
      </div>
    </label>
  );
}

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login', message = '' }) {
  const auth = useAuth();

  const [mode, setMode] = useState(normalizeMode(initialMode)); // 'login' | 'signup' | 'forgot'
  const [step, setStep] = useState('login'); // signup/forgot: 'phone' → 'otp' → 'details' | 'password'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // The signup temp token lives only in memory, never in storage.
  const tempTokenRef = useRef(null);

  const resetForm = (nextMode = normalizeMode(initialMode)) => {
    setMode(nextMode);
    setStep(nextMode === 'login' ? 'login' : 'phone');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setEmail('');
    setShowPassword(false);
    setError('');
    setNotice('');
    setCooldown(0);
    tempTokenRef.current = null;
  };

  // Reset whenever the modal opens or the requested tab changes.
  useEffect(() => {
    if (isOpen) resetForm(normalizeMode(initialMode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!isOpen) return null;

  const switchMode = (nextMode) => resetForm(nextMode);

  // Runs an async step with shared loading and error handling.
  const run = async (fn) => {
    setError('');
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const finish = (user, welcome) => {
    resetForm();
    onSuccess?.(user, welcome);
    onClose?.();
  };

  const requirePhone = () => {
    if (!isValidPhone(phone)) throw new Error('Enter a valid 11-digit phone number, e.g. 08012345678.');
  };
  const requirePassword = () => {
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (password !== confirmPassword) throw new Error('Passwords do not match.');
  };

  // ---- Sign in ----------------------------------------------------------
  const handleLogin = (e) => {
    e.preventDefault();
    run(async () => {
      requirePhone();
      if (!password) throw new Error('Enter your password.');
      const user = await auth.login({ phone, password });
      finish(user, `Welcome back, ${user.name || 'there'}! 👋`);
    });
  };

  // ---- Sign up: phone → OTP → details ------------------------------------
  const sendSignupOtp = (e) => {
    e.preventDefault();
    run(async () => {
      requirePhone();
      await auth.startSignup(phone);
      setStep('otp');
      setCooldown(RESEND_SECONDS);
      setNotice(`We sent a 6-digit code to ${normalizePhone(phone)}.`);
    });
  };

  const verifySignupOtp = (e) => {
    e.preventDefault();
    run(async () => {
      if (!/^\d{6}$/.test(otp)) throw new Error('Enter the 6-digit code.');
      tempTokenRef.current = await auth.confirmSignupOtp(phone, otp);
      setNotice('');
      setStep('details');
    });
  };

  const completeSignup = (e) => {
    e.preventDefault();
    run(async () => {
      if (fullName.trim().length < 2) throw new Error('Enter your full name.');
      if (!EMAIL_RE.test(email.trim())) throw new Error('Enter a valid email address.');
      requirePassword();
      const user = await auth.completeSignup({
        tempToken: tempTokenRef.current,
        fullName,
        email,
        password,
        passwordConfirmation: confirmPassword,
      });
      finish(user, `Account created! Welcome to Gada, ${user.name}! 🎉`);
    });
  };

  // ---- Forgot password: phone → OTP → new password -----------------------
  const sendResetOtp = (e) => {
    e.preventDefault();
    run(async () => {
      requirePhone();
      await auth.requestPasswordReset(phone);
      setStep('otp');
      setCooldown(RESEND_SECONDS);
      setNotice(`If an account exists for ${normalizePhone(phone)}, a code has been sent.`);
    });
  };

  const verifyResetOtp = (e) => {
    e.preventDefault();
    run(async () => {
      if (!/^\d{6}$/.test(otp)) throw new Error('Enter the 6-digit code.');
      await auth.verifyPasswordResetOtp(otp);
      setNotice('');
      setStep('password');
    });
  };

  const resetPassword = (e) => {
    e.preventDefault();
    run(async () => {
      requirePassword();
      const user = await auth.resetPassword({ phone, password });
      finish(user, 'Password updated. You are now signed in.');
    });
  };

  const resend = () => {
    if (cooldown > 0 || loading) return;
    run(async () => {
      if (mode === 'signup') await auth.resendSignupOtp(phone);
      else await auth.requestPasswordReset(phone);
      setCooldown(RESEND_SECONDS);
      setNotice('A new code has been sent.');
    });
  };

  const togglePassword = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  const phoneField = (
    <Field
      icon={Phone}
      label="Phone number"
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      placeholder="08012345678"
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      maxLength={14}
      required
    />
  );

  const otpField = (
    <Field
      icon={KeyRound}
      label="6-digit code"
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="000000"
      value={otp}
      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
      required
    />
  );

  const passwordFields = (label = 'Password') => (
    <>
      <Field
        icon={Lock}
        label={label}
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        trailing={togglePassword}
        required
      />
      <Field
        icon={Lock}
        label="Confirm password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="Re-enter password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />
    </>
  );

  const resendRow = (
    <div style={{ textAlign: 'center', fontSize: 13, color: '#64748B', marginTop: 4 }}>
      Didn’t get it?{' '}
      <button
        type="button"
        onClick={resend}
        disabled={cooldown > 0 || loading}
        style={{ background: 'none', border: 'none', color: cooldown > 0 ? '#94A3B8' : ORANGE, fontWeight: 700, cursor: cooldown > 0 ? 'default' : 'pointer' }}
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
      </button>
    </div>
  );

  const titles = {
    login: 'Sign in to Gada',
    signup: 'Create your account',
    forgot: 'Reset your password',
  };

  let form = null;
  if (mode === 'login') {
    form = (
      <form onSubmit={handleLogin} noValidate>
        {phoneField}
        <Field
          icon={Lock}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          trailing={togglePassword}
          required
        />
        <div style={{ textAlign: 'right', marginTop: -6, marginBottom: 6 }}>
          <button type="button" onClick={() => switchMode('forgot')} style={linkBtn}>
            Forgot password?
          </button>
        </div>
        <button type="submit" disabled={loading} style={primaryBtn(loading)}>
          {loading ? 'Signing in…' : 'Sign in'} {!loading && <ArrowRight size={18} />}
        </button>
      </form>
    );
  } else if (mode === 'signup' && step === 'phone') {
    form = (
      <form onSubmit={sendSignupOtp} noValidate>
        {phoneField}
        <p style={hint}>We’ll text you a code to verify this number.</p>
        <button type="submit" disabled={loading} style={primaryBtn(loading)}>
          {loading ? 'Sending code…' : 'Send code'} {!loading && <ArrowRight size={18} />}
        </button>
      </form>
    );
  } else if (step === 'otp') {
    const onSubmit = mode === 'signup' ? verifySignupOtp : verifyResetOtp;
    form = (
      <form onSubmit={onSubmit} noValidate>
        {otpField}
        <button type="submit" disabled={loading || otp.length !== 6} style={primaryBtn(loading || otp.length !== 6)}>
          {loading ? 'Verifying…' : 'Verify code'}
        </button>
        {resendRow}
      </form>
    );
  } else if (mode === 'signup' && step === 'details') {
    form = (
      <form onSubmit={completeSignup} noValidate>
        <Field icon={User} label="Full name" autoComplete="name" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Field icon={Mail} label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {passwordFields()}
        <button type="submit" disabled={loading} style={primaryBtn(loading)}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    );
  } else if (mode === 'forgot' && step === 'phone') {
    form = (
      <form onSubmit={sendResetOtp} noValidate>
        {phoneField}
        <button type="submit" disabled={loading} style={primaryBtn(loading)}>
          {loading ? 'Sending code…' : 'Send reset code'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button type="button" onClick={() => switchMode('login')} style={linkBtn}>Back to sign in</button>
        </div>
      </form>
    );
  } else if (mode === 'forgot' && step === 'password') {
    form = (
      <form onSubmit={resetPassword} noValidate>
        {passwordFields('New password')}
        <button type="submit" disabled={loading} style={primaryBtn(loading)}>
          {loading ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titles[mode]}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={{ width: '100%', maxWidth: 420, background: '#FFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ background: 'linear-gradient(135deg, #0B132B 0%, #0F172A 100%)', padding: '24px 28px', color: '#FFF', position: 'relative' }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ position: 'absolute', right: 20, top: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
          <div style={{ fontSize: 13, opacity: 0.8 }}>🇳🇬 Gada</div>
          <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>{titles[mode]}</h2>
        </div>

        <div style={{ padding: '22px 28px 28px' }}>
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 18 }}>
              {[['login', 'Sign in'], ['signup', 'Create account']].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchMode(key)}
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 9, fontWeight: 700, cursor: 'pointer', background: mode === key ? ORANGE : 'transparent', color: mode === key ? '#FFF' : '#475569' }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {message && <p style={{ ...hint, marginTop: 0, color: '#B45309' }}>{message}</p>}
          {notice && !error && <p style={{ ...hint, marginTop: 0, color: '#047857' }}>{notice}</p>}
          {error && (
            <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#FEF2F2', color: '#B91C1C', borderRadius: 10, padding: '10px 12px', fontSize: 14, marginBottom: 14 }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {form}

          {mode === 'signup' && step === 'phone' && (
            <p style={{ ...hint, textAlign: 'center', marginTop: 16 }}>
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('login')} style={linkBtn}>Sign in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const linkBtn = { background: 'none', border: 'none', color: ORANGE, fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13 };
const hint = { fontSize: 13, color: '#64748B', margin: '0 0 12px' };
