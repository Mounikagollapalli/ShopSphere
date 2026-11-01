import { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";

export default function useShopData() {
  const [data, setData] = useState({ products: [], categories: [], orders: [], customers: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const names = ["products", "categories", "orders", "users"];
    const results = await Promise.allSettled(names.map((n) => api.get("/" + n)));
    const get = (i) => (results[i].status === "fulfilled" ? results[i].value.data : []);
    results.forEach((r, i) => {
      if (r.status === "rejected") console.warn(`Could not load /${names[i]}`);
    });
    setData({
      products: get(0),
      categories: get(1),
      orders: get(2),
      customers: get(3),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, loading, reload: load };
}