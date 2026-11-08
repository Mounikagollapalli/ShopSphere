import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const CART_KEY = "shopsphere_guest_cart";
const WISHLIST_KEY = "shopsphere_guest_wishlist";

function readItems(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => readItems(CART_KEY));
  const [wishlist, setWishlist] = useState(() => readItems(WISHLIST_KEY));

  useEffect(() => localStorage.setItem(CART_KEY, JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist)), [wishlist]);

  const addToCart = async (product, qty = 1) => {
    const max = Number(product.stock ?? 99);
    setCart((current) => {
      const existing = current.find((item) => String(item.productId) === String(product.id));
      if (existing) return current.map((item) =>
        String(item.productId) === String(product.id)
          ? { ...item, qty: Math.min(Number(item.qty) + qty, max) }
          : item
      );
      return [...current, { id: String(product.id), productId: product.id, qty: Math.min(qty, max) }];
    });
    return true;
  };

  const updateQty = async (itemId, qty) => {
    setCart((current) => qty < 1
      ? current.filter((item) => String(item.id) !== String(itemId))
      : current.map((item) => String(item.id) === String(itemId) ? { ...item, qty } : item));
  };

  const removeFromCart = async (itemId) => {
    setCart((current) => current.filter((item) => String(item.id) !== String(itemId)));
  };

  const clearCart = async () => setCart([]);

  const toggleWishlist = async (product) => {
    setWishlist((current) => current.some((item) => String(item.productId) === String(product.id))
      ? current.filter((item) => String(item.productId) !== String(product.id))
      : [...current, { id: String(product.id), productId: product.id }]);
    return true;
  };

  const isWished = (productId) =>
    wishlist.some((item) => String(item.productId) === String(productId));

  const cartCount = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const wishCount = wishlist.length;

  return (
    <CartContext.Provider value={{
      cart, wishlist, cartCount, wishCount, addToCart, updateQty,
      removeFromCart, clearCart, toggleWishlist, isWished,
      reload: async () => {},
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);