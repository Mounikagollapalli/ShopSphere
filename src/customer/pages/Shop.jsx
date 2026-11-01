import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import useCatalog from "../hooks/useCatalog";
import ProductCard from "../components/ProductCard";

export default function Shop() {
  const { products, categories, loading } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("");

  const category = params.get("category") || "";

  const pick = (id) => (id ? setParams({ category: id }) : setParams({}));

  let list = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) &&
      (!category || String(p.categoryId) === category)
  );

  if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
  if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
  if (sort === "rating") list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  if (loading) return <p>Loading...</p>;

  const chip = (active) =>
    `whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${
      active ? "bg-indigo-600 text-white" : "bg-white text-slate-700 shadow-sm"
    }`;

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Shop</h2>

      {/* Search and sort */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:max-w-sm"
          placeholder="Search products..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="">Sort by</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
          <option value="rating">Top Rated</option>
          <option value="name">Name A to Z</option>
        </select>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button className={chip(!category)} onClick={() => pick("")}>
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={chip(category === String(c.id))}
            onClick={() => pick(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">{list.length} products</p>

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>

      {list.length === 0 && (
        <p className="py-10 text-center text-slate-500">No products found.</p>
      )}
    </div>
  );
}