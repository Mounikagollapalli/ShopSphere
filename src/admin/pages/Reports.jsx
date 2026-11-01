import useShopData from "../hooks/useShopData";
import { money, bestSelling, revenueByMonth, ordersByMonth } from "../utils/helpers";

export default function Reports() {
  const { orders, products, loading } = useShopData();
  if (loading) return <p>Loading...</p>;

  const best = bestSelling(orders, products, 10);
  const revenue = revenueByMonth(orders);
  const counts = ordersByMonth(orders);

  const exportCsv = () => {
    const rows = [["Product", "Units Sold", "Revenue"], ...best.map((b) => [b.name, b.qty, b.revenue])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "best-selling-report.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Reports</h2>
        <button onClick={exportCsv} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-semibold mb-3">Best-Selling Products</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-2">#</th><th>Product</th><th>Units Sold</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            {best.map((b, i) => (
              <tr key={b.name} className="border-t">
                <td className="py-2">{i + 1}</td><td>{b.name}</td><td>{b.qty}</td><td>{money(b.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="font-semibold mb-3">Monthly Sales Report</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-2">Month</th><th>Orders</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            {revenue.map((r) => (
              <tr key={r.month} className="border-t">
                <td className="py-2">{r.month}</td>
                <td>{counts.find((c) => c.month === r.month)?.orders || 0}</td>
                <td>{money(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}