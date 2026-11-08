import catalog from "../catalog.json";

export default function useCatalog() {
  return {
    products: catalog.products || [],
    categories: catalog.categories || [],
    loading: false,
  };
}
