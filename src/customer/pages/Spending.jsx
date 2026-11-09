import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import useCatalog from "../hooks/useCatalog";
import { useAuth } from "../context/AuthContext";
import StatCard from "../../admin/components/StatCard";
import ChartCard from "../../admin/components/ChartCard";
import {
  money, validOrders, revenueByMonth, categorySales, bestSelling,
} from "../../admin/utils/helpers";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7", "#14b8a6", "#475569"];
const ORDERS_KEY = "shopsphere_guest_orders";

function readOrdersForUser(userId) {
  try {
    const stored = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((order) => String(order.customerId) === String(userId));
  } catch {
    return [];
  }
}

export default function Spending() {
  const { user } = useAuth();
  const { products, categories, loading: catLoading } = useCatalog();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const uid = user?.id;

  useEffect(() => {
    if (!uid) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const load = () => {
      setOrders(readOrdersForUser(uid));
      setLoading(false);
    };

    load();
    window.addEventListener("storage", load);
    window.addEventListener("shopsphere:data-updated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("shopsphere:data-updated", load);
    };
  }, [uid]);

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-slate-600">Please login to see your spending.</p>
        <Link
          to="/login"
          state={{ from: "/spending" }}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white"
        >
          Login
        </Link>
      </div>
    );
  }

  if (loading || catLoading) return <p>Loading...</p>;

  const good = validOrders(orders);
  if (good.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-slate-600">No spending yet. Place an order to see your analytics.</p>
        <Link to="/shop" className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white">
          Start Shopping
        </Link>
      </div>
    );
  }

  const total = good.reduce((sum, order) => sum + Number(order.total), 0);
  const itemsBought = good.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0), 0);
  const average = Math.round(total / good.length);
  const byMonth = revenueByMonth(orders);
  const byCategory = categorySales(orders, products, categories);
  const topItems = bestSelling(orders, products, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Spending</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Spent" value={money(total)} color="text-green-600" />
        <StatCard title="Orders" value={good.length} />
        <StatCard title="Items Bought" value={itemsBought} color="text-orange-500" />
        <StatCard title="Average Order" value={money(average)} color="text-sky-600" />
      </div>
      <p className="text-xs text-slate-500">Cancelled orders are not counted.</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Monthly Spending">
          <ResponsiveContainer>
            <LineChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => money(value)} />
              <Line type="monotone" dataKey="revenue" name="Spent" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Spending by Category">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90} label>
                {byCategory.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => money(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Most Bought Products">
          <ResponsiveContainer>
            <BarChart data={topItems} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} />
              <Tooltip />
              <Bar dataKey="qty" name="Units" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
