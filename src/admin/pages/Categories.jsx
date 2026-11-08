import { useState } from "react";
import useShopData from "../hooks/useShopData";

export default function Categories() {
  const { categories, products, loading, reload, saveCategory, deleteCategory } = useShopData();
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");

  const countProducts = (id) =>
    products.filter((p) => String(p.categoryId) === String(id)).length;

  const resetForm = () => {
    setName("");
    setEditId(null);
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return setError("Category name is required.");

    const duplicate = categories.some(
      (c) => c.name.toLowerCase() === clean.toLowerCase() && String(c.id) !== String(editId)
    );
    if (duplicate) return setError("This category already exists.");

    try {
      if (editId) saveCategory({ id: editId, name: clean });
      else saveCategory({ name: clean });
      resetForm();
      reload();
    } catch (err) {
      setError("Could not save this category. Please try again.");
      console.error(err);
    }
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setName(c.name);
    setError("");
  };

  const remove = async (c) => {
    if (countProducts(c.id) > 0) {
      return setError(`Cannot delete "${c.name}" because it still has products.`);
    }
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      deleteCategory(c.id);
      if (String(editId) === String(c.id)) resetForm();
      reload();
    } catch (err) {
      setError("Could not delete the category.");
      console.error(err);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">Categories</h2>

      <form onSubmit={submit} className="flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white"
          placeholder="Category name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
        />
        <button className="bg-indigo-600 text-white px-4 rounded-lg text-sm">
          {editId ? "Update" : "Add"}
        </button>
        {editId && (
          <button
            type="button"
            onClick={resetForm}
            className="bg-slate-200 px-4 rounded-lg text-sm"
          >
            Cancel
          </button>
        )}
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-xl shadow-sm p-5">
        {categories.length === 0 ? (
          <p className="text-sm text-slate-500">No categories yet. Add your first one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">Name</th>
                <th>Products</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-2">{c.name}</td>
                  <td>{countProducts(c.id)}</td>
                  <td className="space-x-3">
                    <button className="text-indigo-600" onClick={() => startEdit(c)}>
                      Edit
                    </button>
                    <button className="text-red-600" onClick={() => remove(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}