import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import useCatalog from "../hooks/useCatalog";
import { useCart } from "../context/CartContext";
import { money } from "../../admin/utils/helpers";

export default function ProductDetails() {
  const { id } = useParams();
  const { products, categories, loading } = useCatalog();
  const { addToCart, toggleWishlist, isWished } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (loading) return <p>Loading...</p>;
  const p = products.find((x) => String(x.id) === String(id));
  if (!p) return <div className="py-16 text-center"><p className="mb-4 text-slate-600">Product not found.</p><Link to="/shop" className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white">Back to Shop</Link></div>;

  const fallback = `https://placehold.co/600x600/64748b/ffffff.png?text=${encodeURIComponent(p.name)}`;
  const category = categories.find((c) => String(c.id) === String(p.categoryId))?.name;
  const outOfStock = p.stock === 0;
  const wished = isWished(p.id);
  const handleAdd = async () => { try { await addToCart(p, qty); setAdded(true); } catch (err) { console.error(err); } };
  const handleWish = async () => { try { await toggleWishlist(p); } catch (err) { console.error(err); } };

  return (
    <div className="space-y-4">
      <Link to="/shop" className="text-sm text-indigo-600 hover:underline">← Back to Shop</Link>
      <div className="grid gap-8 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-2 md:p-8">
        <div className="rounded-xl bg-slate-100">
          <img src={p.image || fallback} alt={p.name} className="h-72 w-full object-contain md:h-96"
            onError={(e) => { if (!e.currentTarget.dataset.failed) { e.currentTarget.dataset.failed = "1"; e.currentTarget.src = fallback; } }} />
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">{p.brand} {category && `• ${category}`}</p>
          <h1 className="text-2xl font-bold text-slate-800">{p.name}</h1>
          {p.rating && <p className="text-amber-500">★ {p.rating}</p>}
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-indigo-600">{money(p.price)}</p>
            {p.discount > 0 && <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">{p.discount}% off</span>}
          </div>
          <p className="text-slate-600">{p.description}</p>
          <p className={`text-sm font-medium ${outOfStock ? "text-red-600" : p.stock < 10 ? "text-yellow-600" : "text-green-600"}`}>
            {outOfStock ? "Out of stock" : p.stock < 10 ? `Only ${p.stock} left` : "In stock"}
          </p>
          {!outOfStock && <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Quantity</span>
            <div className="flex items-center rounded-lg border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-1 text-lg">−</button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <button onClick={() => setQty(Math.min(p.stock, qty + 1))} disabled={qty >= p.stock} className="px-3 py-1 text-lg disabled:text-slate-300">+</button>
            </div>
          </div>}
          <div className="mt-2 flex flex-wrap gap-3">
            <button onClick={handleAdd} disabled={outOfStock} className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">Add to Cart</button>
            <button onClick={handleWish} className={`rounded-lg border px-5 py-2.5 font-semibold ${wished ? "border-red-300 text-red-500" : "text-slate-600"}`}>{wished ? "♥ In Wishlist" : "♡ Add to Wishlist"}</button>
          </div>
          {added && <p className="text-sm text-green-600">Added to cart. <Link to="/cart" className="font-medium underline">Go to cart</Link></p>}
        </div>
      </div>
    </div>
  );
}