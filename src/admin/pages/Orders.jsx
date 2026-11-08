import { useEffect, useState } from "react";
import { money } from "../utils/helpers";

const STORAGE_KEY = "shopsphere_guest_orders";
const STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

function readOrders() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function Orders() {
  const [orders, setOrders] = useState(readOrders);

  useEffect(() => {
    const syncOrders = () => setOrders(readOrders());
    window.addEventListener("storage", syncOrders);
    return () => window.removeEventListener("storage", syncOrders);
  }, []);

  const updateStatus = (id, status) => {
    setOrders((current) => {
      const updated = current.map((order) =>
        String(order.id) === String(id) ? { ...order, status } : order
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const sorted = [...orders].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Orders</h2>
        <span className="text-sm text-slate-500">{orders.length} guest orders</span>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
        {sorted.length === 0 ? (
          <p className="py-10 text-center text-slate-500">No guest orders yet. Orders placed from this browser will appear here.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Payment Status</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((order) => (
                <tr key={order.id} className="border-t align-top">
                  <td className="py-3">#{order.id}</td>
                  <td>
                    <div className="font-medium">{order.shipping?.name || "Guest Customer"}</div>
                    <div className="text-xs text-slate-500">{order.shipping?.phone || ""}</div>
                  </td>
                  <td>{order.date}</td>
                  <td>{(order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0)}</td>
                  <td>{money(order.total)}</td>
                  <td>{order.payment}</td>
                  <td>{order.paymentStatus}</td>
                  <td>
                    <select className="rounded border px-2 py-1" value={order.status} onChange={(event) => updateStatus(order.id, event.target.value)}>
                      {STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-slate-500">Demo note: guest orders are stored in this browser only. They are not shared across different browsers or devices.</p>
    </div>
  );
}