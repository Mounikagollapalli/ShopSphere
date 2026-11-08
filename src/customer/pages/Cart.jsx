import { Link } from "react-router-dom";
import useCatalog from "../hooks/useCatalog";
import { useCart } from "../context/CartContext";
import { money } from "../../admin/utils/helpers";

export default function Cart() {
  const { cart, updateQty, removeFromCart } = useCart();
  const { products, loading } = useCatalog();
  if (loading) return <p>Loading...</p>;

  const rows = cart.map((item) => ({
    ...item,
    product: products.find((p) => String(p.id) === String(item.productId)),
  })).filter((row) => row.product);
  const itemCount = rows.reduce((sum, row) => sum + row.qty, 0);
  const total = rows.reduce((sum, row) => sum + row.product.price * row.qty, 0);

  if (!rows.length) return (
    <div className="py-16 text-center">
      <p className="mb-4 text-slate-600">Your cart is empty.</p>
      <Link to="/shop" className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white">Start Shopping</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Your Cart</h2>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {rows.map(({ id, qty, product }) => {
            const fallback = `https://placehold.co/200x200/64748b/ffffff.png?text=${encodeURIComponent(product.name)}`;
            return (
              <div key={id} className="flex gap-4 rounded-xl bg-white p-4 shadow-sm">
                <img src={product.image || fallback} alt={product.name} className="h-24 w-24 shrink-0 rounded-lg bg-slate-100 object-contain"
                  onError={(e) => { if (!e.currentTarget.dataset.failed) { e.currentTarget.dataset.failed = "1"; e.currentTarget.src = fallback; } }} />
                <div className="flex flex-1 flex-col">
                  <h3 className="font-semibold text-slate-800">{product.name}</h3>
                  <p className="text-sm text-slate-500">{money(product.price)} each</p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-center rounded-lg border">
                      <button onClick={() => updateQty(id, qty - 1)} className="px-3 py-1 text-lg" aria-label="Decrease">−</button>
                      <span className="w-8 text-center text-sm">{qty}</span>
                      <button onClick={() => updateQty(id, qty + 1)} disabled={qty >= product.stock} className="px-3 py-1 text-lg disabled:text-slate-300" aria-label="Increase">+</button>
                    </div>
                    <p className="font-bold text-indigo-600">{money(product.price * qty)}</p>
                    <button onClick={() => removeFromCart(id)} className="text-sm text-red-600 hover:underline">Remove</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-fit rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold">Order Summary</h3>
          <div className="flex justify-between text-sm text-slate-600"><span>Items</span><span>{itemCount}</span></div>
          <div className="mt-2 flex justify-between border-t pt-3 text-lg font-bold"><span>Total</span><span>{money(total)}</span></div>
          <Link to="/checkout" className="mt-4 block w-full rounded-lg bg-indigo-600 py-2.5 text-center font-semibold text-white hover:bg-indigo-700">Proceed to Checkout</Link>
        </div>
      </div>
    </div>
  );
}