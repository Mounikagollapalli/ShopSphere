import api from "../../api/axios";
import useShopData from "../hooks/useShopData";
import { money } from "../utils/helpers";

const STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

export default function Orders() {
  const { orders, customers, loading, reload } = useShopData();

  const customerName = (id) => id === "Guest" ? "Guest Customer" : customers.find((c) => String(c.id) === String(id))?.name || "Unknown";

  const updateStatus = async (id, status) => {
    await api.patch(`/orders/${id}`, { status });
    reload();
  };

  if (loading) return <p>Loading...</p>;

  const sorted = [...orders].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Orders</h2>
      <div className="bg-white rounded-xl shadow-sm p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-2">Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {sorted.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="py-2">#{o.id}</td>
                <td>{customerName(o.customerId)}</td>
                <td>{o.date}</td>
                <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                <td>{money(o.total)}</td>
                <td>
                  <select className="border rounded px-2 py-1" value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}