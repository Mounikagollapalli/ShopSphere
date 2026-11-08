import { useState } from "react";
import useShopData from "../hooks/useShopData";
import Modal from "../components/Modal";
import { money } from "../utils/helpers";

const COLORS = {
  Mobile: "6366f1",
  Laptops: "0ea5e9",
  Headphones: "f59e0b",
  Smartwatches: "22c55e",
  Tablets: "a855f7",
  Accessories: "ef4444",
  TVs: "14b8a6",
  Gaming: "475569",
};

// Always-working placeholder image with the product name on it
const ph = (text, category) =>
  `https://placehold.co/400x400/${COLORS[category] || "64748b"}/ffffff.png?text=${encodeURIComponent(text)}`;

// To use a real photo, replace the `image` value with a DIRECT image link
// (a link that ends in .jpg / .png / .webp), or a local file like "/images/iphone.jpg"
const productsList = [
  { name: "iPhone 17 Pro Max", category: "Mobile", image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMEIHIx_P3QM0GYgrI2Ka4D4kzFW1xZajXCewKx6vvVA&s" },
  { name: "Samsung Galaxy S25 Ultra", category: "Mobile", image: ph("Galaxy S25 Ultra", "Mobile") },
  { name: "OnePlus 13", category: "Mobile", image: ph("OnePlus 13", "Mobile") },
  { name: "Google Pixel 10", category: "Mobile", image: ph("Pixel 10", "Mobile") },

  { name: "Apple MacBook Air M4", category: "Laptops", image: ph("MacBook Air M4", "Laptops") },
  { name: "Dell XPS 14", category: "Laptops", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500" },
  { name: "HP Pavilion", category: "Laptops", image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500" },
  { name: "Lenovo Legion Gaming Laptop", category: "Laptops", image: ph("Lenovo Legion", "Laptops") },

  { name: "Apple AirPods Pro", category: "Headphones", image: ph("AirPods Pro", "Headphones") },
  { name: "Sony WH-1000XM6", category: "Headphones", image: ph("Sony WH-1000XM6", "Headphones") },
  { name: "boAt Airdopes", category: "Headphones", image: ph("boAt Airdopes", "Headphones") },
  { name: "Samsung Galaxy Buds", category: "Headphones", image: ph("Galaxy Buds", "Headphones") },

  { name: "Apple Watch Series 11", category: "Smartwatches", image: ph("Apple Watch 11", "Smartwatches") },
  { name: "Samsung Galaxy Watch 8", category: "Smartwatches", image: ph("Galaxy Watch 8", "Smartwatches") },
  { name: "Noise ColorFit", category: "Smartwatches", image: ph("Noise ColorFit", "Smartwatches") },
  { name: "Garmin Forerunner", category: "Smartwatches", image: ph("Garmin Forerunner", "Smartwatches") },

  { name: "Apple iPad Air", category: "Tablets", image: ph("iPad Air", "Tablets") },
  { name: "Samsung Galaxy Tab", category: "Tablets", image: ph("Galaxy Tab", "Tablets") },
  { name: "OnePlus Pad", category: "Tablets", image: ph("OnePlus Pad", "Tablets") },
  { name: "Lenovo Tab", category: "Tablets", image: ph("Lenovo Tab", "Tablets") },

  { name: "Anker Power Bank", category: "Accessories", image: ph("Anker Power Bank", "Accessories") },
  { name: "Apple USB-C Charger", category: "Accessories", image: ph("USB-C Charger", "Accessories") },
  { name: "Logitech Wireless Keyboard", category: "Accessories", image: ph("Wireless Keyboard", "Accessories") },
  { name: "SanDisk External SSD", category: "Accessories", image: ph("External SSD", "Accessories") },

  { name: "Sony Bravia Smart TV", category: "TVs", image: ph("Sony Bravia TV", "TVs") },
  { name: "Samsung QLED TV", category: "TVs", image: ph("Samsung QLED", "TVs") },
  { name: "JBL Soundbar", category: "TVs", image: ph("JBL Soundbar", "TVs") },

  { name: "PlayStation 5", category: "Gaming", image: ph("PlayStation 5", "Gaming") },
  { name: "Xbox Series X", category: "Gaming", image: ph("Xbox Series X", "Gaming") },
  { name: "Logitech Gaming Mouse", category: "Gaming", image: ph("Gaming Mouse", "Gaming") },
];

const empty = { name: "", categoryId: "", price: "", stock: "", image: "" };

// Shows the image; if the link is broken it falls back to a placeholder tile
function SafeImage({ src, name, className }) {
  const fallback = ph(name || "Product");
  return (
    <img
      src={src || fallback}
      alt={name}
      className={className}
      onError={(e) => {
        if (!e.currentTarget.dataset.failed) {
          e.currentTarget.dataset.failed = "1";
          e.currentTarget.src = fallback;
        }
      }}
    />
  );
}

export default function Products() {
  const { products, categories, loading, reload, saveProduct, deleteProduct } = useShopData();
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const catName = (id) =>
    categories.find((c) => String(c.id) === String(id))?.name || "-";

  const save = async (e) => {
    e.preventDefault();
    const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
    try {
      saveProduct(body);
      setForm(null);
      reload();
    } catch {
      alert("Unable to save product. Please check your server.");
    }
  };

  const remove = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        deleteProduct(id);
        reload();
      } catch {
        alert("Unable to delete product.");
      }
    }
  };

  const list = products.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase())
  );

  if (loading) return <p className="p-6">Loading products...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Products</h2>
          <p className="text-sm text-slate-500">Manage your ShopSphere products</p>
        </div>
        <button
          onClick={() => setForm({ ...empty })}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + Add Product
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className={input + " max-w-sm bg-white"}
          placeholder="Search products..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <p className="text-sm text-slate-500">Total Products: {list.length}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Price</th>
              <th className="px-5 py-4">Stock</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <SafeImage
                      src={p.image}
                      name={p.name}
                      className="h-14 w-14 rounded-lg bg-slate-100 object-contain"
                    />
                    <span className="font-medium text-slate-800">{p.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600">{catName(p.categoryId)}</td>
                <td className="px-5 py-3 font-semibold">{money(p.price)}</td>
                <td className="px-5 py-3">{p.stock}</td>
                <td className="space-x-3 px-5 py-3">
                  <button
                    onClick={() => setForm({ ...p })}
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan="5" className="py-10 text-center text-slate-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal title={form.id ? "Edit Product" : "Add Product"} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-4">
            <input
              className={input}
              placeholder="Product Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <select
              className={input}
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <input
              className={input}
              type="number"
              placeholder="Price"
              min="0"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />

            <input
              className={input}
              type="number"
              placeholder="Stock"
              min="0"
              required
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />

            <select
              className={input}
              value={productsList.some((i) => i.image === form.image) ? form.image : ""}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            >
              <option value="">Choose a ready-made product image</option>
              {productsList.map((item) => (
                <option key={item.name} value={item.image}>{item.name}</option>
              ))}
            </select>

            <input
              className={input}
              placeholder="...or paste a direct image link (.jpg / .png)"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />

            {form.image && (
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs text-slate-500">Image Preview</p>
                <SafeImage
                  src={form.image}
                  name={form.name}
                  className="h-36 w-full object-contain"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Save Product
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}