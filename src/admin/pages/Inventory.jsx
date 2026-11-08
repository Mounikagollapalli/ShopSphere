import { useState } from "react";
import useShopData from "../hooks/useShopData";

const badge = (s) =>
  s === 0
    ? ["Out of stock", "bg-red-100 text-red-700"]
    : s < 10
    ? ["Low stock", "bg-yellow-100 text-yellow-700"]
    : ["In stock", "bg-green-100 text-green-700"];

export default function Inventory() {
  const { products, loading, reload, updateProductStock } = useShopData();
  const [edits, setEdits] = useState({});

  const update = async (id) => {
    if (edits[id] === undefined) return;
    updateProductStock(id, Number(edits[id]));
    setEdits({ ...edits, [id]: undefined });
    reload();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Inventory</h2>
      <div className="bg-white rounded-xl shadow-sm p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="py-2">Product</th><th>Stock</th><th>Status</th><th>Update stock</th></tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const [label, cls] = badge(p.stock);
              return (
                <tr key={p.id} className="border-t">
                  <td className="py-2">{p.name}</td>
                  <td>{p.stock}</td>
                  <td><span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{label}</span></td>
                  <td className="space-x-2">
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-24"
                      value={edits[p.id] ?? p.stock}
                      onChange={(e) => setEdits({ ...edits, [p.id]: e.target.value })}
                    />
                    <button onClick={() => update(p.id)} className="text-indigo-600">Save</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}