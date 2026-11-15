/**
 * Default delivery address. The backend has no default flag for addresses, so the
 * choice is kept on this device, per user.
 */
const key = (userId) => `gada_default_address_${userId}`;

export const getDefaultAddressId = (userId) => {
  if (!userId) return null;
  try {
    return localStorage.getItem(key(userId));
  } catch {
    return null;
  }
};

export const setDefaultAddressId = (userId, addressId) => {
  try {
    localStorage.setItem(key(userId), String(addressId));
  } catch {
    /* storage unavailable */
  }
};
