import { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";

async function fetchShopData() {
  const names = ["products", "categories", "orders", "users"];
  const results = await Promise.allSettled(names.map((name) => api.get(`/${name}`)));
  const get = (index) =>
    results[index].status === "fulfilled" ? results[index].value.data : [];

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn(`Could not load /${names[index]}`, result.reason);
    }
  });

  return {
    products: get(0),
    categories: get(1),
    orders: get(2),
    customers: get(3),
  };
}

export default function useShopData() {
  const [data, setData] = useState({ products: [], categories: [], orders: [], customers: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchShopData());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchShopData().then((shopData) => {
      if (active) {
        setData(shopData);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { ...data, loading, reload: load };
}