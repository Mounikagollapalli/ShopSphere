import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer,
} from "recharts";
import useShopData from "../hooks/useShopData";
import ChartCard from "../components/ChartCard";
import {
  revenueByMonth, ordersByDay, ordersByMonth, bestSelling, categorySales, customerGrowth,
} from "../utils/helpers";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7"];

export default function Analytics() {
  const { orders, products, categories, customers, loading } = useShopData();
  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Sales Analytics</h2>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Monthly Revenue">
          <ResponsiveContainer>
            <LineChart data={revenueByMonth(orders)}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily Orders">
          <ResponsiveContainer>
            <BarChart data={ordersByDay(orders)}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="orders" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Orders">
          <ResponsiveContainer>
            <BarChart data={ordersByMonth(orders)}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="orders" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Best-Selling Products">
          <ResponsiveContainer>
            <BarChart data={bestSelling(orders, products)} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} /><Tooltip />
              <Bar dataKey="qty" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Category-wise Sales">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={categorySales(orders, products, categories)} dataKey="value" nameKey="name" outerRadius={90} label>
                {categorySales(orders, products, categories).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Customer Growth">
          <ResponsiveContainer>
            <AreaChart data={customerGrowth(customers)}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip />
              <Area type="monotone" dataKey="customers" stroke="#0ea5e9" fill="#bae6fd" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}