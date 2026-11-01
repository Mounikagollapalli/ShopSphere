

import { Routes, Route } from "react-router-dom";

import CustomerLayout from "./customer/components/CustomerLayout.jsx";
import Home from "./customer/pages/Home";
import Shop from "./customer/pages/Shop";
import ProductDetails from "./customer/pages/ProductDetails";
import Login from "./customer/pages/Login";
import Signup from "./customer/pages/Signup";
import Cart from "./customer/pages/Cart";
import Wishlist from "./customer/pages/Wishlist";
import Checkout from "./customer/pages/Checkout";
import MyOrders from "./customer/pages/MyOrders";
import Spending from "./customer/pages/Spending";

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
      {/* Part 1: Customer website */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/spending" element={<Spending />} />
      </Route>

      {/* Part 2: Admin dashboard */}
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
    </Routes>
  );
}