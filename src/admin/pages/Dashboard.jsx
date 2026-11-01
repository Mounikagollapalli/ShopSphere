import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import useShopData from "../hooks/useShopData";
import StatCard from "../components/StatCard";
import ChartCard from "../components/ChartCard";
import { money, validOrders, revenueByMonth } from "../utils/helpers";

export default function Dashboard() {
  const { orders, customers, loading } = useShopData();
  if (loading) return <p>Loading...</p>;

  const good = validOrders(orders);
  const revenue = good.reduce((s, o) => s + Number(o.total), 0);
  const sales = good.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const recent = [...orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">ShopSphere</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={money(revenue)} color="text-green-600" />
        <StatCard title="Total Sales (items)" value={sales} />
        <StatCard title="Total Orders" value={orders.length} color="text-orange-500" />
        <StatCard title="Customers" value={customers.length} color="text-sky-600" />
      </div>

      <ChartCard title="Monthly Revenue">
        <ResponsiveContainer>
          <LineChart data={revenueByMonth(orders)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-semibold mb-3">Recent Orders</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-2">Order</th><th>Date</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {recent.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="py-2">#{o.id}</td><td>{o.date}</td><td>{money(o.total)}</td><td>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}