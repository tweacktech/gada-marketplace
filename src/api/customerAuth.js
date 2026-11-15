/**
 * Customer authentication endpoints (live backend, no mocks).
 * Every function resolves to the API envelope: { success, message, data }.
 */
import { apiClient } from './client';

const DEVICE_KEY = 'gada_device_id';

/** Accepts "08012345678", "+234 801 234 5678", "2348012345678" → "08012345678". */
export function normalizePhone(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('234')) return `0${digits.slice(3)}`;
  return digits;
}

export const isValidPhone = (value) => /^\d{11}$/.test(normalizePhone(value));

function deviceInfo() {
  let deviceId;
  try {
    deviceId = localStorage.getItem(DEVICE_KEY);
    if (!deviceId) {
      deviceId = globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, deviceId);
    }
  } catch {
    deviceId = `web-${Date.now()}`;
  }
  return {
    device_id: deviceId,
    device_name: (navigator.userAgent || 'Web browser').slice(0, 200),
    app_type: 'web',
    os: navigator.platform || 'web',
  };
}

export const authApi = {
  // ---- Sign up: phone → OTP → profile -----------------------------------
  createAccount(phone) {
    return apiClient.post('/account/create-account', { phone_number: normalizePhone(phone) }, { auth: false });
  },

  confirmAccountOtp(phone, otp) {
    return apiClient.post(
      '/account/confirm-account',
      { phone_number: normalizePhone(phone), otp: String(otp) },
      { auth: false }
    ); // data: { user_id, phone_number, temp_token, next_step }
  },

  resendSignupOtp(phone) {
    return apiClient.post('/account/resend-otp', { phone_number: normalizePhone(phone) }, { auth: false });
  },

  /** Uses the temp_token from confirmAccountOtp as the Bearer token for this call only. */
  completeAccount({ tempToken, fullName, email, password, passwordConfirmation }) {
    return apiClient.post(
      '/account/complete-account',
      {
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
      },
      { headers: { Authorization: `Bearer ${tempToken}` } }
    ); // data: { user, token, is_complete }
  },

  // ---- Sign in ----------------------------------------------------------
  login({ phone, password }) {
    return apiClient.post(
      '/auth/login',
      { phone_number: normalizePhone(phone), password, ...deviceInfo() },
      { auth: false }
    ); // data: { user, token }
  },

  // ---- Forgot password: phone → OTP → new password ------------------------
  requestPasswordReset(phone) {
    return apiClient.post(
      '/auth/forget-password',
      { phone_number: normalizePhone(phone), account_type: 'customer' },
      { auth: false }
    );
  },

  verifyPasswordResetOtp(otp) {
    return apiClient.post('/auth/verify-pass-otp', { otp: Number(otp) }, { auth: false });
  },

  /** NOTE: the backend does not re-check the OTP here. See the security notes. */
  resetPassword({ phone, password }) {
    return apiClient.post(
      '/auth/confirm-password',
      { phone_number: normalizePhone(phone), password, account_type: 'customer' },
      { auth: false }
    ); // data: { token, user, status_check, pin_exist }
  },

  // ---- Session ----------------------------------------------------------
  getProfile() {
    return apiClient.get('/account/profile');
  },

  logout() {
    return apiClient.get('/account/logout');
  },

  updateProfile(updates) {
    return apiClient.post('/account/update-profile', updates);
  },

  addAddress({ address, label, landmark, latitude, longitude }) {
    return apiClient.post('/account/address', { address, label, landmark, latitude, longitude });
  },
};
