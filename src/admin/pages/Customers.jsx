import useShopData from "../hooks/useShopData";
import { money, validOrders } from "../utils/helpers";

export default function Customers() {
  const { customers, orders, loading } = useShopData();
  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Customers</h2>
      <div className="bg-white rounded-xl shadow-sm p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-2">Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Orders</th><th>Total Spent</th></tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const mine = validOrders(orders).filter((o) => String(o.customerId) === String(c.id));
              return (
                <tr key={c.id} className="border-t">
                  <td className="py-2">{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td>{c.joinedAt}</td>
                  <td>{mine.length}</td>
                  <td>{money(mine.reduce((s, o) => s + Number(o.total), 0))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}