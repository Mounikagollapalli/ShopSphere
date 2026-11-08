import { useCallback, useEffect, useState } from "react";
import {
  readShopData,
  saveProduct,
  deleteProduct,
  saveCategory,
  deleteCategory,
  updateProductStock,
  saveCustomer,
} from "../utils/localStore";

export default function useShopData() {
  const [data, setData] = useState(readShopData);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    setData(readShopData());
    setLoading(false);
  }, []);

  useEffect(() => {
    const sync = () => setData(readShopData());
    window.addEventListener("shopsphere:data-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("shopsphere:data-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    ...data,
    loading,
    reload,
    saveProduct,
    deleteProduct,
    saveCategory,
    deleteCategory,
    updateProductStock,
    saveCustomer,
  };
}
