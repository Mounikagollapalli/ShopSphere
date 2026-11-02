import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import useCatalog from "../hooks/useCatalog";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { money } from "../../admin/utils/helpers";

const PAYMENT_API =
  import.meta.env.VITE_PAYMENT_API_URL || "http://localhost:5000";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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
        <p className="mb-4 text-slate-600">Please login to checkout.</p>
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
    .map((item) => ({
      ...item,
      product: products.find(
        (product) => String(product.id) === String(item.productId)
      ),
    }))
    .filter((row) => row.product);

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-slate-600">Your cart is empty.</p>
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
    (sum, row) => sum + row.product.price * row.qty,
    0
  );

  const saveOrder = async (paymentDetails = {}) => {
    // Always read current stock and prices before saving the order.
    const latest = await Promise.all(
      rows.map((row) =>
        api.get(`/products/${row.product.id}`).then((response) => response.data)
      )
    );

    const short = latest.find((product, index) => product.stock < rows[index].qty);
    if (short) {
      throw new Error(
        `Only ${short.stock} of "${short.name}" are currently available. Please update your cart.`
      );
    }

    const items = rows.map((row, index) => ({
      productId: latest[index].id,
      qty: row.qty,
      price: latest[index].price,
    }));

    const orderTotal = items.reduce(
      (sum, item) => sum + item.qty * item.price,
      0
    );

    const { data: order } = await api.post("/orders", {
      customerId: user.id,
      date: new Date().toLocaleDateString("en-CA"),
      status: "Pending",
      total: orderTotal,
      items,
      payment: paymentDetails.payment || "Cash on Delivery",
      paymentStatus: paymentDetails.paymentStatus || "Pending",
      ...(paymentDetails.razorpayOrderId && {
        razorpayOrderId: paymentDetails.razorpayOrderId,
      }),
      ...(paymentDetails.razorpayPaymentId && {
        razorpayPaymentId: paymentDetails.razorpayPaymentId,
      }),
      shipping: {
        name: form.name,
        phone: form.phone,
        address: form.address,
        city: form.city,
        pincode: form.pincode,
      },
    });

    await api.patch(`/users/${user.id}`, {
      name: form.name,
      phone: form.phone,
    });

    await Promise.all(
      latest.map((product, index) =>
        api.patch(`/products/${product.id}`, {
          stock: product.stock - rows[index].qty,
        })
      )
    );

    await clearCart();
    navigate("/orders", { state: { placed: order.id } });
  };

  const payWithRazorpay = async () => {
    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;

    if (!keyId) {
      throw new Error(
        "Razorpay Test Key ID is missing. Add VITE_RAZORPAY_KEY_ID to your frontend .env file."
      );
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error("Unable to load Razorpay Checkout. Please check your internet connection.");
    }

    // The backend fetches product prices and stock from JSON Server.
    const response = await fetch(`${PAYMENT_API}/api/payments/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: rows.map((row) => ({
          productId: row.product.id,
          qty: row.qty,
        })),
      }),
    });

    const orderData = await response.json();
    if (!response.ok) {
      throw new Error(orderData.message || "Could not create Razorpay order.");
    }

    const checkout = new window.Razorpay({
      key: keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "ShopSphere",
      description: "ShopSphere order payment",
      order_id: orderData.id,
      prefill: {
        name: form.name,
        email: user.email || "",
        contact: form.phone,
      },
      notes: { customerId: String(user.id) },
      theme: { color: "#4f46e5" },
      handler: async (paymentResponse) => {
        try {
          const verifyResponse = await fetch(
            `${PAYMENT_API}/api/payments/verify`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(paymentResponse),
            }
          );

          const verification = await verifyResponse.json();
          if (!verifyResponse.ok || !verification.verified) {
            throw new Error(verification.message || "Payment verification failed.");
          }

          await saveOrder({
            payment: "Razorpay (Test Mode)",
            paymentStatus: "Paid",
            razorpayOrderId: paymentResponse.razorpay_order_id,
            razorpayPaymentId: paymentResponse.razorpay_payment_id,
          });
        } catch (paymentError) {
          console.error("Razorpay payment/order error:", paymentError);
          setError(
            paymentError.message ||
              "Payment was received, but the order could not be saved. Please contact the store."
          );
          setBusy(false);
        }
      },
      modal: {
        ondismiss: () => setBusy(false),
      },
    });

    checkout.on("payment.failed", (event) => {
      setError(event.error?.description || "Payment was not completed. Please try again.");
      setBusy(false);
    });

    checkout.open();
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (form.payment === "Razorpay Test Mode") {
        await payWithRazorpay();
      } else {
        await saveOrder({
          payment: "Cash on Delivery",
          paymentStatus: "Pending",
        });
      }
    } catch (checkoutError) {
      console.error("Checkout error:", checkoutError);
      setError(
        checkoutError.message ||
          "Could not place the order. Please check that JSON Server and the payment server are running."
      );
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">Checkout</h2>

      <form onSubmit={placeOrder} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="font-semibold">Delivery details</h3>

          <input
            className={input}
            placeholder="Full name"
            required
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
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
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
          />

          <textarea
            className={input}
            rows="3"
            placeholder="Address"
            required
            value={form.address}
            onChange={(event) =>
              setForm({ ...form, address: event.target.value })
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className={input}
              placeholder="City"
              required
              value={form.city}
              onChange={(event) =>
                setForm({ ...form, city: event.target.value })
              }
            />
            <input
              className={input}
              placeholder="Pincode"
              required
              pattern="[0-9]{6}"
              title="Enter a 6 digit pincode"
              value={form.pincode}
              onChange={(event) =>
                setForm({ ...form, pincode: event.target.value })
              }
            />
          </div>

          <h3 className="pt-2 font-semibold">Payment method</h3>
          <select
            className={input}
            value={form.payment}
            onChange={(event) =>
              setForm({ ...form, payment: event.target.value })
            }
          >
            <option>Cash on Delivery</option>
            <option>Razorpay Test Mode</option>
          </select>

          {form.payment === "Razorpay Test Mode" ? (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Test Mode only: Razorpay checkout will open, but no real money will be charged.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Pay when your order is delivered.
            </p>
          )}
        </div>

        <div className="h-fit rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold">Order Summary</h3>

          <div className="space-y-2 text-sm">
            {rows.map((row) => (
              <div key={row.id} className="flex justify-between gap-3">
                <span className="text-slate-600">
                  {row.product.name} × {row.qty}
                </span>
                <span>{money(row.product.price * row.qty)}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between border-t pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Processing..."
              : form.payment === "Razorpay Test Mode"
                ? "Pay with Razorpay"
                : "Place Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
