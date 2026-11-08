import { Routes, Route } from "react-router-dom";

import CustomerLayout from "./customer/components/CustomerLayout.jsx";
import Home from "./customer/pages/Home";
import Shop from "./customer/pages/Shop";
import ProductDetails from "./customer/pages/ProductDetails";
import Cart from "./customer/pages/Cart";
import Wishlist from "./customer/pages/Wishlist";
import Checkout from "./customer/pages/Checkout";

import AdminLayout from "./admin/AdminLayout";
import Dashboard from "./admin/pages/Dashboard";
import Products from "./admin/pages/Products";
import Categories from "./admin/pages/Categories";
import Orders from "./admin/pages/Orders";
import Customers from "./admin/pages/Customers";
import Inventory from "./admin/pages/Inventory";
import Analytics from "./admin/pages/Analytics";
import Reports from "./admin/pages/Reports";

export default function App() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<Checkout />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      <Route path="*" element={
        <main className="px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <a className="mt-4 inline-block text-indigo-600 underline" href="/">Return home</a>
        </main>
      } />
    </Routes>
  );
}