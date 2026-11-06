
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import useShopData from "../hooks/useShopData";
import StatCard from "../components/StatCard";
import ChartCard from "../components/ChartCard";

import { money } from "../utils/helpers";

// Six sample customers
const demoCustomers = [
  { id: "C101", name: "Rupa", email: "rupa@gmail.com" },
  { id: "C102", name: "Swaroopa", email: "swaroopa@gmail.com" },
  { id: "C103", name: "Nitin", email: "nitin@gmail.com" },
  { id: "C104", name: "Likhit", email: "likhit@gmail.com" },
  { id: "C105", name: "XYZ", email: "xyz@gmail.com" },
  { id: "C106", name: "Priya", email: "priya@gmail.com" },
];

// Sample purchases from previous months
const demoOrders = [
  {
    id: "ORD101",
    customerId: "C101",
    date: "2026-01-12",
    total: 5000,
    status: "Delivered",
    items: [{ name: "Headphones", qty: 1 }],
  },
  {
    id: "ORD102",
    customerId: "C102",
    date: "2026-02-15",
    total: 10000,
    status: "Delivered",
    items: [{ name: "Smart Watch", qty: 2 }],
  },
  {
    id: "ORD103",
    customerId: "C103",
    date: "2026-03-10",
    total: 18000,
    status: "Delivered",
    items: [{ name: "Laptop", qty: 1 }],
  },
  {
    id: "ORD104",
    customerId: "C104",
    date: "2026-04-18",
    total: 26000,
    status: "Delivered",
    items: [{ name: "Smartphone", qty: 2 }],
  },
  {
    id: "ORD105",
    customerId: "C105",
    date: "2026-05-20",
    total: 35000,
    status: "Delivered",
    items: [{ name: "Laptop", qty: 2 }],
  },
  {
    id: "ORD106",
    customerId: "C106",
    date: "2026-06-22",
    total: 48000,
    status: "Delivered",
    items: [{ name: "Electronics Bundle", qty: 3 }],
  },
];

// Rising monthly revenue graph
const monthlyData = [
  { month: "Jan", revenue: 5000 },
  { month: "Feb", revenue: 10000 },
  { month: "Mar", revenue: 18000 },
  { month: "Apr", revenue: 26000 },
  { month: "May", revenue: 35000 },
  { month: "Jun", revenue: 48000 },
];

export default function Dashboard() {
  const {
    orders = [],
    customers = [],
    products = [],
    loading,
  } = useShopData();

  if (loading) return <p>Loading dashboard...</p>;

  // Combine demo and real customers
  const allCustomers = [
    ...demoCustomers,
    ...customers.filter(
      (customer) =>
        !demoCustomers.some(
          (demo) => String(demo.id) === String(customer.id)
        )
    ),
  ];

  // Combine demo and real orders
  const allOrders = [
    ...demoOrders,
    ...orders.filter(
      (order) =>
        !demoOrders.some(
          (demo) => String(demo.id) === String(order.id)
        )
    ),
  ];

  const revenue = allOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const totalSales = allOrders.reduce(
    (sum, order) =>
      sum +
      (order.items || []).reduce(
        (total, item) => total + Number(item.qty || 0),
        0
      ),
    0
  );

  const deliveredOrders = allOrders.filter(
    (order) =>
      String(order.status).toLowerCase() === "delivered"
  );

  const activeCustomerIds = new Set(
    allOrders.map((order) =>
      String(order.customerId || order.userId || "")
    )
  );

  const activeCustomers = allCustomers.filter(
    (customer) =>
      activeCustomerIds.has(String(customer.id))
  ).length;

  const getCustomerName = (order) => {
    const customer = allCustomers.find(
      (item) =>
        String(item.id) ===
        String(order.customerId || order.userId)
    );

    return (
      customer?.name ||
      customer?.fullName ||
      order.customerName ||
      "Guest Customer"
    );
  };

  const recentOrders = [...allOrders]
    .sort(
      (a, b) =>
        new Date(b.date || 0) - new Date(a.date || 0)
    )
    .slice(0, 8);

  return (
    <div className="space-y-6">

      {/* Dashboard Heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          ShopSphere Nexus
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Admin Dashboard | Business Performance Overview
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <StatCard
          title="Total Revenue"
          value={money(revenue)}
          color="text-green-600"
        />

        <StatCard
          title="Total Sales"
          value={totalSales}
          color="text-indigo-600"
        />

        <StatCard
          title="Total Orders"
          value={allOrders.length}
          color="text-orange-500"
        />

        <StatCard
          title="Total Customers"
          value={allCustomers.length}
          color="text-sky-600"
        />

        <StatCard
          title="Total Products"
          value={products.length}
          color="text-purple-600"
        />

        <StatCard
          title="Active Customers"
          value={activeCustomers}
          color="text-emerald-600"
        />

        <StatCard
          title="Items Sold"
          value={totalSales}
          color="text-pink-600"
        />

        <StatCard
          title="Delivered Orders"
          value={deliveredOrders.length}
          color="text-teal-600"
        />

      </div>

      {/* Revenue Growth Chart */}
      <ChartCard title="Monthly Revenue Growth">

        <div className="w-full h-80">

          <ResponsiveContainer width="100%" height="100%">

            <LineChart
              data={monthlyData}
              margin={{
                top: 20,
                right: 25,
                left: 15,
                bottom: 10,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="month"
                tick={{ fill: "#64748b", fontSize: 12 }}
              />

              <YAxis
                domain={[0, 50000]}
                tickFormatter={(value) => `₹${value / 1000}k`}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />

              <Tooltip
                formatter={(value) => [
                  money(value),
                  "Revenue",
                ]}
              />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={4}
                dot={{
                  r: 5,
                  fill: "#6366f1",
                  strokeWidth: 2,
                }}
                activeDot={{ r: 8 }}
                isAnimationActive={true}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </ChartCard>

      {/* Customer Details */}
      <div className="bg-white rounded-xl shadow-sm p-5">

        <h3 className="font-semibold text-lg text-slate-800 mb-4">
          All Registered Customers
        </h3>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="p-3">Customer ID</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>

            <tbody>

              {allCustomers.map((customer) => (

                <tr key={customer.id} className="border-t hover:bg-slate-50">

                  <td className="p-3">#{customer.id}</td>

                  <td className="p-3 font-medium">
                    {customer.name || customer.fullName}
                  </td>

                  <td className="p-3">
                    {customer.email || "-"}
                  </td>

                  <td className="p-3">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                      {activeCustomerIds.has(String(customer.id))
                        ? "Purchased"
                        : "Registered"}
                    </span>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      </div>

      {/* Recent Customer Orders */}
      <div className="bg-white rounded-xl shadow-sm p-5">

        <h3 className="font-semibold text-lg text-slate-800 mb-4">
          Recent Customer Orders
        </h3>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="p-3">Order ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Total</th>
                <th className="p-3">Delivery Status</th>
              </tr>
            </thead>

            <tbody>

              {recentOrders.map((order) => (

                <tr key={order.id} className="border-t hover:bg-slate-50">

                  <td className="p-3 font-medium">
                    #{order.id}
                  </td>

                  <td className="p-3 font-medium">
                    {getCustomerName(order)}
                  </td>

                  <td className="p-3">
                    {order.date}
                  </td>

                  <td className="p-3 font-semibold">
                    {money(order.total)}
                  </td>

                  <td className="p-3">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                      {order.status}
                    </span>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      </div>

    </div>
  );
}
