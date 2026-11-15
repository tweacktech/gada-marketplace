import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient, UNAUTHORIZED_EVENT } from '../api/client';
import { authApi } from '../api/customerAuth';

const AuthContext = createContext(null);

const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'G';

/** Maps the backend user (full_name, addresses…) onto the shape the UI reads. */
export function normalizeUser(user) {
  if (!user) return null;
  const name = user.full_name || user.name || user.username || '';
  return { ...user, name, avatar: initialsOf(name), addresses: user.addresses || [] };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setTokenState] = useState(() => apiClient.getToken());
  const [isLoading, setIsLoading] = useState(Boolean(apiClient.getToken()));

  const startSession = useCallback((user, newToken) => {
    apiClient.setToken(newToken);
    setTokenState(newToken);
    setCurrentUser(normalizeUser(user));
  }, []);

  const clearSession = useCallback(() => {
    apiClient.setToken(null);
    setTokenState(null);
    setCurrentUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const res = await authApi.getProfile();
    const user = normalizeUser(res.data);
    setCurrentUser(user);
    return user;
  }, []);

  // Any 401 on an authenticated call means the server dropped the session.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, clearSession);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, clearSession);
  }, [clearSession]);

  // Restore the session on load.
  useEffect(() => {
    if (!apiClient.getToken()) {
      setIsLoading(false);
      return;
    }
    refreshProfile()
      .catch((err) => {
        if (err.status === 401) clearSession();
      })
      .finally(() => setIsLoading(false));
  }, [refreshProfile, clearSession]);

  // ---- Sign in ----------------------------------------------------------
  const login = useCallback(
    async ({ phone, password }) => {
      const { data } = await authApi.login({ phone, password });
      if (data.user?.account_type && data.user.account_type !== 'customer') {
        throw new Error('This phone number is not a customer account. Please use the correct app.');
      }
      startSession(data.user, data.token);
      return normalizeUser(data.user);
    },
    [startSession]
  );

  // ---- Sign up ----------------------------------------------------------
  const startSignup = useCallback((phone) => authApi.createAccount(phone), []);
  const resendSignupOtp = useCallback((phone) => authApi.resendSignupOtp(phone), []);

  /** Resolves to the temp_token that completeSignup needs. */
  const confirmSignupOtp = useCallback(async (phone, otp) => {
    const { data } = await authApi.confirmAccountOtp(phone, otp);
    return data.temp_token;
  }, []);

  const completeSignup = useCallback(
    async (details) => {
      const { data } = await authApi.completeAccount(details);
      startSession(data.user, data.token);
      return normalizeUser(data.user);
    },
    [startSession]
  );

  // ---- Forgot password --------------------------------------------------
  const requestPasswordReset = useCallback((phone) => authApi.requestPasswordReset(phone), []);
  const verifyPasswordResetOtp = useCallback((otp) => authApi.verifyPasswordResetOtp(otp), []);

  const resetPassword = useCallback(
    async ({ phone, password }) => {
      const { data } = await authApi.resetPassword({ phone, password });
      startSession(data.user, data.token);
      return normalizeUser(data.user);
    },
    [startSession]
  );

  // ---- Session & profile ------------------------------------------------
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* token may already be gone server-side; clear locally regardless */
    }
    clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(
    async (updates) => {
      await authApi.updateProfile(updates);
      return refreshProfile();
    },
    [refreshProfile]
  );

  const addAddress = useCallback(
    async (newAddress) => {
      await authApi.addAddress({
        address: newAddress.address,
        label: newAddress.label || 'Home',
        landmark: newAddress.landmark || '',
        latitude: newAddress.latitude,
        longitude: newAddress.longitude,
      });
      return refreshProfile();
    },
    [refreshProfile]
  );

  // No "default address" endpoint exists in the customer API yet, so this is local only.
  const setDefaultAddress = useCallback((addressId) => {
    setCurrentUser((prev) =>
      prev ? { ...prev, addresses: prev.addresses.map((a) => ({ ...a, isDefault: a.id === addressId })) } : prev
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated: !!currentUser,
        token,
        isLoading,
        login,
        startSignup,
        resendSignupOtp,
        confirmSignupOtp,
        completeSignup,
        requestPasswordReset,
        verifyPasswordResetOtp,
        resetPassword,
        logout,
        updateProfile,
        refreshProfile,
        addAddress,
        setDefaultAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
