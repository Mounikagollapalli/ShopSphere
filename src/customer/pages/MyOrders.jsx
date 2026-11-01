import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../../api/axios";
import useCatalog from "../hooks/useCatalog";
import { useAuth } from "../context/AuthContext";
import { money } from "../../admin/utils/helpers";

const BADGE = {
  Pending: "bg-yellow-100 text-yellow-700",
  Processing: "bg-blue-100 text-blue-700",
  Shipped: "bg-purple-100 text-purple-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default function MyOrders() {
  const { user } = useAuth();
  const { products } = useCatalog();
  const location = useLocation();
  const uid = user?.id;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/orders", { params: { customerId: uid } });
      setOrders([...data].sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id)));
    } catch (err) {
      setError("Could not load your orders.");
    }
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (id) =>
    products.find((p) => String(p.id) === String(id))?.name || "Removed product";

  const cancel = async (o) => {
    if (!window.confirm(`Cancel order #${o.id}?`)) return;
    setError("");
    try {
      await api.patch(`/orders/${o.id}`, { status: "Cancelled" });
      // Put the stock back
      await Promise.all(
        o.items.map(async (i) => {
          try {
            const { data: p } = await api.get(`/products/${i.productId}`);
            await api.patch(`/products/${p.id}`, { stock: p.stock + i.qty });
          } catch {
            /* product was removed, nothing to restore */
          }
        })
      );
      load();
    } catch (err) {
      setError("Could not cancel the order.");
    }
  };

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-slate-600">Please login to see your orders.</p>
        <Link
          to="/login"
          state={{ from: "/orders" }}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white"
        >
          Login
        </Link>
      </div>
    );
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">My Orders</h2>

      {location.state?.placed && (
        <div className="rounded-lg bg-green-100 p-3 text-sm text-green-800">
          Order #{location.state.placed} placed successfully. Thank you for shopping!
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {orders.length === 0 ? (
        <div className="py-12 text-center">
          <p className="mb-4 text-slate-600">You have no orders yet.</p>
          <Link to="/shop" className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">Order #{o.id}</p>
                  <p className="text-sm text-slate-500">{o.date}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${BADGE[o.status] || "bg-slate-100"}`}>
                  {o.status}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-sm">
                {o.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between gap-3">
                    <span className="text-slate-600">{nameOf(i.productId)} × {i.qty}</span>
                    <span>{money(i.price * i.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <p className="font-bold text-indigo-600">Total: {money(o.total)}</p>
                {o.status === "Pending" && (
                  <button onClick={() => cancel(o)} className="text-sm text-red-600 hover:underline">
                    Cancel order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}