import { useEffect, useState } from "react";
import catalog from "../catalog.json";

const STORAGE_KEYS = {
  products: "shopsphere_admin_products",
  categories: "shopsphere_admin_categories",
};

function readCatalog() {
  try {
    const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.products) || "null");
    const categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.categories) || "null");
    return {
      products: Array.isArray(products) ? products : catalog.products || [],
      categories: Array.isArray(categories) ? categories : catalog.categories || [],
    };
  } catch {
    return {
      products: catalog.products || [],
      categories: catalog.categories || [],
    };
  }
}

export default function useCatalog() {
  const [data, setData] = useState(readCatalog);

  useEffect(() => {
    const sync = () => setData(readCatalog());
    window.addEventListener("shopsphere:data-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("shopsphere:data-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { ...data, loading: false };
}
