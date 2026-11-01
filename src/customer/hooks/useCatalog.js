import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function useCatalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [p, c] = await Promise.allSettled([
        api.get("/products"),
        api.get("/categories"),
      ]);
      if (p.status === "fulfilled") setProducts(p.value.data);
      else console.warn("Could not load /products");
      if (c.status === "fulfilled") setCategories(c.value.data);
      else console.warn("Could not load /categories");
      setLoading(false);
    };
    load();
  }, []);

  return { products, categories, loading };
}