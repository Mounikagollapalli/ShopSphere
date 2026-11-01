
import { Link } from "react-router-dom";
import useCatalog from "../hooks/useCatalog";
import ProductCard from "../components/ProductCard";

export default function Home() {

    // Get products, categories and loading status
    const { products, categories, loading } = useCatalog();

    // Display loading message while fetching data
    if (loading) {
        return (
            <div className="flex min-h-60 items-center justify-center">
                <p className="text-lg font-medium text-gray-600">
                    Loading products...
                </p>
            </div>
        );
    }

    // Get the top 4 rated products
    const featuredProducts = [...products]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 4);

    return (
        <div className="space-y-10">

            {/* Hero Banner */}
            <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-pink-500 p-8 text-white sm:p-12">     
                           <h1 className="text-3xl font-bold sm:text-4xl">
                Welcome to ShopSphere
            </h1>

                <p className="mt-2 max-w-xl text-indigo-100">
                    Mobiles, laptops, headphones, watches and more,
                    all in one place.
                </p>

                <Link
                    to="/shop"
                    className="mt-5 inline-block rounded-lg bg-white px-5 py-2.5 font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                    Shop Now
                </Link>

            </section>

            {/* Shop by Category */}
            <section>

                <h2 className="mb-4 text-xl font-bold text-gray-800">
                    Shop by Category
                </h2>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                    {categories.map((category) => (
                        <Link
                            key={category.id}
                            to={`/shop?category=${category.id}`}
                            className="rounded-xl bg-white p-4 text-center font-medium text-gray-700 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                        >
                            {category.name}
                        </Link>
                    ))}

                </div>

            </section>

            {/* Top Rated Products */}
            <section>

                <div className="mb-4 flex items-center justify-between">

                    <h2 className="text-xl font-bold text-gray-800">
                        Top Rated Products
                    </h2>

                    <Link
                        to="/shop"
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                        View All
                    </Link>

                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    {featuredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            p={product}
                        />
                    ))}

                </div>

            </section>

        </div>
    );
}
