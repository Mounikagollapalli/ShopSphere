import { useState } from "react";
import { Link } from "react-router-dom";
import { money } from "../../admin/utils/helpers";
import { useCart } from "../context/CartContext";

export default function ProductCard({ p }) {
  const { addToCart, toggleWishlist, isWished } = useCart();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const fallback = `https://placehold.co/400x400/64748b/ffffff.png?text=${encodeURIComponent(p.name)}`;
  const outOfStock = p.stock === 0;
  const wished = isWished(p.id);

  const handleAdd = async () => {
    setBusy(true);
    try {
      await addToCart(p);
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleWish = async () => {
    try { await toggleWishlist(p); } catch (err) { console.error(err); }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md">
      <div className="relative bg-slate-100">
        <Link to={`/product/${p.id}`}>
          <img src={p.image || fallback} alt={p.name} className="h-48 w-full object-contain"
            onError={(e) => { if (!e.currentTarget.dataset.failed) { e.currentTarget.dataset.failed = "1"; e.currentTarget.src = fallback; } }} />
        </Link>
        {p.discount > 0 && <span className="absolute left-2 top-2 rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">{p.discount}% off</span>}
        <button onClick={handleWish} aria-label="Toggle wishlist"
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg shadow ${wished ? "text-red-500" : "text-slate-500"}`}>
          {wished ? "♥" : "♡"}
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {p.brand && <p className="text-xs text-slate-500">{p.brand}</p>}
        <Link to={`/product/${p.id}`} className="font-semibold text-slate-800 hover:text-indigo-600">{p.name}</Link>
        {p.rating && <p className="text-sm text-amber-500">★ {p.rating}</p>}
        <p className="mt-auto pt-2 text-lg font-bold text-indigo-600">{money(p.price)}</p>
        <button onClick={handleAdd} disabled={outOfStock || busy}
          className="mt-2 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
          {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}