import { Link } from "react-router-dom";
import useCatalog from "../hooks/useCatalog";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";

export default function Wishlist() {
  const { wishlist } = useCart();
  const { products, loading } = useCatalog();
  if (loading) return <p>Loading...</p>;
  const items = wishlist.map((item) => products.find((p) => String(p.id) === String(item.productId))).filter(Boolean);
  if (!items.length) return (
    <div className="py-16 text-center">
      <p className="mb-4 text-slate-600">Your wishlist is empty.</p>
      <Link to="/shop" className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white">Browse Products</Link>
    </div>
  );
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Your Wishlist ({items.length})</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((product) => <ProductCard key={product.id} p={product} />)}
      </div>
    </div>
  );
}