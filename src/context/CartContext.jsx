import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { marketplaceApi } from '../api/marketplace';

const CartContext = createContext(null);
const PROMO_STORAGE_KEY = 'gada_cart_promo';

/** Maps the server CartResource onto the shapes the cart and checkout screens render. */
export function adaptCart(raw) {
  const vendors = raw?.vendors || [];
  const cartItems = vendors.flatMap((v) =>
    (v.items || []).map((it) => ({
      id: it.id, // server cart-item id: used for update and remove
      productId: it.product?.id,
      name: it.product?.name || 'Item',
      image: it.product?.image || null,
      price: Number(it.unit_price || 0),
      quantity: it.quantity,
      calculatedPrice: Number(it.total_price || 0),
      notes: it.notes,
      vendor: v.vendor_name,
      vendorId: String(v.vendor_id),
      locationName: '',
      selectedVariant: null,
    }))
  );
  const vendorGroups = vendors.map((v) => ({
    vendorName: v.vendor_name,
    vendorId: String(v.vendor_id),
    locationName: '',
    items: cartItems.filter((i) => i.vendorId === String(v.vendor_id)),
    subtotal: Number(v.subtotal || 0),
    vendorDeliveryFee: Number(v.delivery_fee || 0),
  }));
  return { cartItems, vendorGroups, raw };
}

export function CartProvider({ children }) {
  const { currentUser } = useAuth();
  const [raw, setRaw] = useState(null);
  const [cartError, setCartError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(() => {
    try {
      const saved = localStorage.getItem(PROMO_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (appliedPromo) localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(appliedPromo));
      else localStorage.removeItem(PROMO_STORAGE_KEY);
    } catch { /* storage unavailable */ }
  }, [appliedPromo]);

  const reloadCart = useCallback(async () => {
    if (!currentUser) {
      setRaw(null);
      return;
    }
    try {
      setCartError('');
      setRaw(await marketplaceApi.getCart());
    } catch (err) {
      setCartError(err.message);
    }
  }, [currentUser]);

  useEffect(() => { reloadCart(); }, [reloadCart]);

  // A basket holds items from one vendor only. Adding from another vendor asks
  // the customer to replace the basket; if they agree, it is cleared first.
  const addToCart = async (item) => {
    if (!currentUser) {
      window.alert('Please sign in to add items to your cart.');
      return false;
    }
    try {
      setCartError('');
      const current = raw?.vendors?.[0];
      if (current && String(current.vendor_id) !== String(item.vendorId)) {
        const replace = window.confirm(
          `Your cart has items from ${current.vendor_name}. Start a new cart with items from ${item.vendor || 'this vendor'}? Your current cart will be cleared.`
        );
        if (!replace) return false;
        await marketplaceApi.clearCart();
      }
      setRaw(await marketplaceApi.addToCart({ productId: item.id, quantity: item.quantity || 1, notes: item.notes }));
      return true;
    } catch (err) {
      setCartError(err.message);
      window.alert(err.message);
      return false;
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity <= 0) return removeItem(itemId);
    try {
      setCartError('');
      setRaw(await marketplaceApi.updateCartItem(itemId, newQuantity));
    } catch (err) {
      setCartError(err.message);
    }
  };

  const removeItem = async (itemId) => {
    try {
      setCartError('');
      setRaw(await marketplaceApi.removeCartItem(itemId));
    } catch (err) {
      setCartError(err.message);
    }
  };

  const clearCart = async () => {
    setAppliedPromo(null);
    try {
      await marketplaceApi.clearCart();
    } catch (err) {
      setCartError(err.message);
    }
    setRaw(null);
  };

  // Promo codes are a local, client-side feature; the marketplace API has no promo endpoint.
  const applyPromo = (code) => {
    const normalized = (code || '').trim().toUpperCase();
    if (normalized === 'GADA20') {
      const promo = { code: 'GADA20', discountPercent: 20, description: '20% Off Storewide' };
      setAppliedPromo(promo);
      return { success: true, message: '20% Gada Discount Applied! 🎉', promo };
    }
    if (normalized === 'FREEDEL') {
      const promo = { code: 'FREEDEL', freeDelivery: true, description: 'Free Delivery on Orders' };
      setAppliedPromo(promo);
      return { success: true, message: 'Free Dispatch Delivery Applied! 🛵', promo };
    }
    return { success: false, message: 'Invalid promo code. Try GADA20 or FREEDEL' };
  };

  const removePromo = () => setAppliedPromo(null);

  const { cartItems, vendorGroups } = useMemo(() => adaptCart(raw), [raw]);

  const summary = useMemo(() => {
    const subtotal = Number(raw?.subtotal || 0);
    let deliveryFee = Number(raw?.delivery_fee || 0);
    const serviceFee = Number(raw?.service_charge || 0);
    let discountAmount = 0;
    if (appliedPromo?.discountPercent) {
      discountAmount = Math.round((subtotal * appliedPromo.discountPercent) / 100);
    } else if (appliedPromo?.freeDelivery) {
      discountAmount = deliveryFee;
      deliveryFee = 0;
    }
    return {
      subtotal,
      deliveryFee,
      serviceFee,
      discountAmount,
      total: Math.max(0, subtotal + deliveryFee + serviceFee - discountAmount),
      vendorCount: vendorGroups.length,
      deliveryError: raw?.delivery_pricing_error || null,
    };
  }, [raw, vendorGroups, appliedPromo]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        vendorGroups,
        summary,
        appliedPromo,
        cartError,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        applyPromo,
        removePromo,
        reloadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
