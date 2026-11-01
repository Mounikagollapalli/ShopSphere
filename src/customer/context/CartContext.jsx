import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../../api/axios";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.id;

  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  // Load this user's cart and wishlist from JSON Server
  const load = useCallback(async () => {
    if (!uid) {
      setCart([]);
      setWishlist([]);
      return;
    }
    const [c, w] = await Promise.allSettled([
      api.get("/cart", { params: { userId: uid } }),
      api.get("/wishlist", { params: { userId: uid } }),
    ]);
    setCart(c.status === "fulfilled" ? c.value.data : []);
    setWishlist(w.status === "fulfilled" ? w.value.data : []);
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- Cart ----------
  // Returns false when the user is not logged in
  const addToCart = async (product, qty = 1) => {
    if (!uid) return false;
    const max = product.stock ?? 99;
    const existing = cart.find((i) => String(i.productId) === String(product.id));

    if (existing) {
      const newQty = Math.min(existing.qty + qty, max);
      await api.patch(`/cart/${existing.id}`, { qty: newQty });
    } else {
      await api.post("/cart", { userId: uid, productId: product.id, qty: Math.min(qty, max) });
    }
    await load();
    return true;
  };

  const updateQty = async (itemId, qty) => {
    if (qty < 1) await api.delete(`/cart/${itemId}`);
    else await api.patch(`/cart/${itemId}`, { qty });
    await load();
  };

  const removeFromCart = async (itemId) => {
    await api.delete(`/cart/${itemId}`);
    await load();
  };

  const clearCart = async () => {
    await Promise.all(cart.map((i) => api.delete(`/cart/${i.id}`)));
    await load();
  };

  // ---------- Wishlist ----------
  // Returns false when the user is not logged in
  const toggleWishlist = async (product) => {
    if (!uid) return false;
    const existing = wishlist.find((i) => String(i.productId) === String(product.id));
    if (existing) await api.delete(`/wishlist/${existing.id}`);
    else await api.post("/wishlist", { userId: uid, productId: product.id });
    await load();
    return true;
  };

  const isWished = (productId) =>
    wishlist.some((i) => String(i.productId) === String(productId));

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const wishCount = wishlist.length;

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        cartCount,
        wishCount,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        toggleWishlist,
        isWished,
        reload: load,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);