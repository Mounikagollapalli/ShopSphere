
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import useCatalog from "../hooks/useCatalog";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { money } from "../../admin/utils/helpers";

export default function Checkout() {
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const { products, loading } = useCatalog();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: "",
    city: "",
    pincode: "",
    payment: "Cash on Delivery",
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-slate-600">
          Please login to checkout.
        </p>

        <Link
          to="/login"
          state={{ from: "/checkout" }}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white"
        >
          Login
        </Link>
      </div>
    );
  }

  if (loading) return <p>Loading...</p>;

  const rows = cart
    .map((i) => ({
      ...i,
      product: products.find(
        (p) => String(p.id) === String(i.productId)
      ),
    }))
    .filter((r) => r.product);

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-slate-600">
          Your cart is empty.
        </p>

        <Link
          to="/shop"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  const total = rows.reduce(
    (s, r) => s + r.product.price * r.qty,
    0
  );

  const placeOrder = async (e) => {
    e.preventDefault();

    setError("");
    setBusy(true);

    try {
      // Check latest product stock
      const latest = await Promise.all(
        rows.map((r) =>
          api.get(`/products/${r.product.id}`).then((x) => x.data)
        )
      );

      const short = latest.find(
        (p, i) => p.stock < rows[i].qty
      );

      if (short) {
        setError(
          `Sorry, only ${short.stock} of "${short.name}" left. Please update your cart.`
        );
        setBusy(false);
        return;
      }

      // Prepare order items
      const items = rows.map((r) => ({
        productId: r.product.id,
        qty: r.qty,
        price: r.product.price,
      }));

      // Save order
      const { data: order } = await api.post("/orders", {
        customerId: user.id,
        date: new Date().toLocaleDateString("en-CA"),
        status: "Pending",
        total: items.reduce(
          (s, i) => s + i.qty * i.price,
          0
        ),
        items,
        payment: form.payment,
        shipping: {
          name: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          pincode: form.pincode,
        },
      });

      // Update customer details in users collection
      await api.patch(`/users/${user.id}`, {
        name: form.name,
        phone: form.phone,
      });

      // Reduce product stock
      await Promise.all(
        latest.map((p, i) =>
          api.patch(`/products/${p.id}`, {
            stock: p.stock - rows[i].qty,
          })
        )
      );

      // Clear cart
      await clearCart();

      // Navigate to orders page
      navigate("/orders", {
        state: { placed: order.id },
      });

    } catch (err) {
      console.error("Checkout error:", err);

      setError(
        "Could not place the order. Please check JSON Server and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">
        Checkout
      </h2>

      <form
        onSubmit={placeOrder}
        className="grid gap-6 lg:grid-cols-3"
      >
        {/* Delivery Details */}
        <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="font-semibold">
            Delivery details
          </h3>

          <input
            className={input}
            placeholder="Full name"
            required
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <input
            className={input}
            placeholder="Phone number"
            type="tel"
            required
            pattern="[0-9]{10}"
            title="Enter a 10 digit phone number"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />

          <textarea
            className={input}
            rows="3"
            placeholder="Address"
            required
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className={input}
              placeholder="City"
              required
              value={form.city}
              onChange={(e) =>
                setForm({ ...form, city: e.target.value })
              }
            />

            <input
              className={input}
              placeholder="Pincode"
              required
              pattern="[0-9]{6}"
              title="Enter a 6 digit pincode"
              value={form.pincode}
              onChange={(e) =>
                setForm({ ...form, pincode: e.target.value })
              }
            />
          </div>

          {/* Payment Method */}
          <h3 className="pt-2 font-semibold">
            Payment method
          </h3>

          <select
            className={input}
            value={form.payment}
            onChange={(e) =>
              setForm({ ...form, payment: e.target.value })
            }
          >
            <option>Cash on Delivery</option>
            <option>UPI (demo)</option>
            <option>Card (demo)</option>
          </select>

          <p className="text-xs text-slate-500">
            This is a demo shop. No real payment is taken.
          </p>
        </div>

        {/* Order Summary */}
        <div className="h-fit rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold">
            Order Summary
          </h3>

          <div className="space-y-2 text-sm">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex justify-between gap-3"
              >
                <span className="text-slate-600">
                  {r.product.name} × {r.qty}
                </span>

                <span>
                  {money(r.product.price * r.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between border-t pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Placing order..." : "Place Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
