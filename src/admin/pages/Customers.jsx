
import { useState } from "react";
import axios from "axios";
import useShopData from "../hooks/useShopData";
import { money, validOrders } from "../utils/helpers";

const API = import.meta.env.VITE_API_URL;

export default function Customers() {
  const { customers, orders, loading } = useShopData();

  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [saving, setSaving] = useState(false);

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      await axios.patch(
        `${API}/customers/${editingCustomer.id}`,
        form
      );

      alert("Customer details updated successfully!");

      setEditingCustomer(null);

      window.location.reload();
    } catch (error) {
      console.error("Update customer error:", error);
      alert("Failed to update customer details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Customers</h2>

      <div className="bg-white rounded-xl shadow-sm p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {customers.map((c) => {
              const mine = validOrders(orders).filter(
                (o) => String(o.customerId) === String(c.id)
              );

              return (
                <tr key={c.id} className="border-t">
                  <td className="py-3">{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td>{c.joinedAt}</td>
                  <td>{mine.length}</td>
                  <td>
                    {money(
                      mine.reduce(
                        (s, o) => s + Number(o.total),
                        0
                      )
                    )}
                  </td>

                  <td>
                    <button
                      onClick={() => handleEdit(c)}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingCustomer && (
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <h3 className="text-xl font-bold">
            Edit Customer Details
          </h3>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Customer Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full border rounded-lg p-2"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="bg-slate-200 px-5 py-2 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
