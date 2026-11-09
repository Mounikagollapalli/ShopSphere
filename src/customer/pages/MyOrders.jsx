import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useCatalog from "../hooks/useCatalog";
import { useAuth } from "../context/AuthContext";
import { money } from "../../admin/utils/helpers";
import { readShopData, updateProductStock } from "../../admin/utils/localStore";

const ORDERS_KEY = "shopsphere_guest_orders";
const BADGE = {
  Pending: "bg-yellow-100 text-yellow-700",
  Processing: "bg-blue-100 text-blue-700",
  Shipped: "bg-purple-100 text-purple-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

function readOrders(userId) {
  try {
    const stored = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((order) => String(order.customerId) === String(userId))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  } catch {
    return [];
  }
}

export default function MyOrders() {
  const { user } = useAuth();
  const { products } = useCatalog();
  const location = useLocation();
  const uid = user?.id;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const sync = () => {
      setOrders(readOrders(uid));
      setLoading(false);
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("shopsphere:data-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("shopsphere:data-updated", sync);
    };
  }, [uid]);

  const nameOf = (id) =>
    products.find((product) => String(product.id) === String(id))?.name || "Removed product";

  const cancel = (order) => {
    if (order.status !== "Pending" || order.paymentStatus === "Paid") return;
    if (!window.confirm(`Cancel order #${order.id}?`)) return;

    try {
      const allOrders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
      if (!Array.isArray(allOrders)) throw new Error("Invalid saved orders.");

      const target = allOrders.find((item) => String(item.id) === String(order.id));
      if (!target || target.status !== "Pending" || target.paymentStatus === "Paid") return;

      localStorage.setItem(
        ORDERS_KEY,
        JSON.stringify(allOrders.map((item) =>
          String(item.id) === String(order.id) ? { ...item, status: "Cancelled" } : item
        ))
      );

      const currentProducts = readShopData().products;
      for (const item of target.items || []) {
        const product = currentProducts.find((entry) => String(entry.id) === String(item.productId));
        if (product) {
          updateProductStock(product.id, Number(product.stock || 0) + Number(item.qty || 0));
        }
      }

      setOrders(readOrders(uid));
      setError("");
    } catch {
      setError("Could not cancel the order in this browser. Please try again.");
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
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">Order #{order.id}</p>
                  <p className="text-sm text-slate-500">{order.date}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${BADGE[order.status] || "bg-slate-100"}`}>
                  {order.status}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {(order.items || []).map((item, index) => (
                  <div key={index} className="flex justify-between gap-3">
                    <span className="text-slate-600">{nameOf(item.productId)} × {item.qty}</span>
                    <span>{money(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <p className="font-bold text-indigo-600">Total: {money(order.total)}</p>
                {order.status === "Pending" && order.paymentStatus !== "Paid" && (
                  <button onClick={() => cancel(order)} className="text-sm text-red-600 hover:underline">
                    Cancel order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">Demo note: orders are saved in this browser only and are not synced across devices.</p>
    </div>
  );
}
