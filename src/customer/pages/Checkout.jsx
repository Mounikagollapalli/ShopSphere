
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../../api/axios";
import useCatalog from "../hooks/useCatalog";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { money } from "../../admin/utils/helpers";

// --------------------------------------------------
// RAZORPAY CONFIGURATION
// --------------------------------------------------

const RAZORPAY_KEY_ID = (
  import.meta.env.VITE_RAZORPAY_KEY_ID || ""
).trim();

// Payments run through this project's Vercel serverless functions.
// Keep this same-origin so the browser never calls a Render backend.
const PAYMENT_API = "";

// --------------------------------------------------
// PAYMENT API HELPER
// --------------------------------------------------

async function postPaymentRequest(path, body) {
  let response;

  try {
    response = await fetch(`${PAYMENT_API}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Payment API connection error:", error);

    throw new Error(
      "Unable to connect to ShopSphere payment services. Please try again in a moment."
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const responseText = await response.text().catch(() => "");

    console.error("Invalid payment API response:", {
      status: response.status,
      response: responseText,
    });

    throw new Error(
      `Payment server returned an invalid response (HTTP ${response.status}). Check your backend URL and deployment logs.`
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Payment request failed (HTTP ${response.status}).`
    );
  }

  return data;
}

// --------------------------------------------------
// LOAD RAZORPAY CHECKOUT SCRIPT
// --------------------------------------------------

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), {
        once: true,
      });

      existingScript.addEventListener("error", () => resolve(false), {
        once: true,
      });

      return;
    }

    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

// --------------------------------------------------
// CHECKOUT COMPONENT
// --------------------------------------------------

export default function Checkout() {
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const { products, loading } = useCatalog();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
    payment: "Cash on Delivery",
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  // ------------------------------------------------
  // PREFILL CUSTOMER DETAILS
  // ------------------------------------------------

  useEffect(() => {
    if (user) {
      setForm((previous) => ({
        ...previous,
        name: previous.name || user.name || "",
        phone: previous.phone || user.phone || "",
      }));
    }
  }, [user]);

  // ------------------------------------------------
  // HANDLE FORM INPUTS
  // ------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ------------------------------------------------
  // MATCH CART PRODUCTS
  // ------------------------------------------------

  const rows = (cart || [])
    .map((item) => {
      const product = products.find(
        (product) =>
          String(product.id) === String(item.productId)
      );

      return {
        ...item,
        product,
        qty: Number(item.qty),
      };
    })
    .filter(
      (row) =>
        row.product &&
        Number.isFinite(row.qty) &&
        row.qty > 0
    );

  // ------------------------------------------------
  // CALCULATE TOTAL
  // ------------------------------------------------

  const total = rows.reduce(
    (sum, row) =>
      sum + Number(row.product.price) * row.qty,
    0
  );

  // ------------------------------------------------
  // SAVE ORDER
  // ------------------------------------------------

  const saveOrder = async (paymentDetails = {}) => {
    // Get the latest product details from JSON Server.
    const latestProducts = await Promise.all(
      rows.map(async (row) => {
        const response = await api.get(
          `/products/${row.product.id}`
        );

        return response.data;
      })
    );

    // Check product stock.
    for (let index = 0; index < latestProducts.length; index++) {
      const product = latestProducts[index];
      const requestedQty = rows[index].qty;

      if (Number(product.stock) < requestedQty) {
        throw new Error(
          `Only ${product.stock} units of "${product.name}" are available. Please update your cart.`
        );
      }
    }

    // Prepare order items using latest product prices.
    const orderItems = rows.map((row, index) => ({
      productId: latestProducts[index].id,
      qty: row.qty,
      price: Number(latestProducts[index].price),
    }));

    const orderTotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    // Create customer order.
    const orderPayload = {
      customerId: user.id,
      date: new Date().toISOString().slice(0, 10),
      status: "Pending",
      total: orderTotal,
      items: orderItems,

      payment:
        paymentDetails.payment || "Cash on Delivery",

      paymentStatus:
        paymentDetails.paymentStatus || "Pending",

      shipping: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        pincode: form.pincode.trim(),
      },

      ...(paymentDetails.razorpayOrderId && {
        razorpayOrderId: paymentDetails.razorpayOrderId,
      }),

      ...(paymentDetails.razorpayPaymentId && {
        razorpayPaymentId: paymentDetails.razorpayPaymentId,
      }),
    };

    const response = await api.post("/orders", orderPayload);
    const savedOrder = response.data;

    // Show success before optional follow-up operations.
    setPlacedOrder(savedOrder);
    setError("");
    setBusy(false);

    // Update product stock.
    try {
      await Promise.all(
        latestProducts.map((product, index) =>
          api.patch(`/products/${product.id}`, {
            stock:
              Number(product.stock) - rows[index].qty,
          })
        )
      );
    } catch (stockError) {
      console.error(
        "Order saved, but stock update failed:",
        stockError
      );
    }

    // Update customer profile.
    try {
      await api.patch(`/users/${user.id}`, {
        name: form.name.trim(),
        phone: form.phone.trim(),
      });
    } catch (profileError) {
      console.error(
        "Order saved, but profile update failed:",
        profileError
      );
    }

    // Clear cart.
    try {
      await clearCart();
    } catch (cartError) {
      console.error(
        "Order saved, but cart clearing failed:",
        cartError
      );
    }

    return savedOrder;
  };

  // ------------------------------------------------
  // RAZORPAY PAYMENT
  // ------------------------------------------------

  const payWithRazorpay = async () => {
    // Check Razorpay key.
    if (!RAZORPAY_KEY_ID) {
      throw new Error(
        "Razorpay Key ID is missing. Add VITE_RAZORPAY_KEY_ID to your Vercel environment variables."
      );
    }

    if (!RAZORPAY_KEY_ID.startsWith("rzp_test_")) {
      throw new Error(
        "Invalid Razorpay test key. Your test Key ID must start with rzp_test_."
      );
    }

    // Load Razorpay script.
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded || !window.Razorpay) {
      throw new Error(
        "Unable to load Razorpay Checkout. Please check your internet connection."
      );
    }

    // Create order through payment backend.
    const orderData = await postPaymentRequest(
      "/api/payments/create-order",
      {
        items: rows.map((row) => ({
          productId: row.product.id,
          qty: row.qty,
        })),
      }
    );

    // Validate backend response.
    if (!orderData.id || !orderData.amount) {
      console.error("Invalid Razorpay order response:", orderData);

      throw new Error(
        "The payment server did not return a valid Razorpay order. Please check your backend create-order API."
      );
    }

    // Razorpay checkout options.
    const options = {
      key: RAZORPAY_KEY_ID,

      amount: orderData.amount,
      currency: orderData.currency || "INR",

      name: "ShopSphere",
      description: "ShopSphere order payment",

      order_id: orderData.id,

      prefill: {
        name: form.name.trim(),
        email: user.email || "",
        contact: form.phone.trim(),
      },

      notes: {
        customerId: String(user.id),
      },

      theme: {
        color: "#4f46e5",
      },

      // Verify payment after successful checkout.
      handler: async (paymentResponse) => {
        let paymentVerified = false;

        try {
          const verification = await postPaymentRequest(
            "/api/payments/verify",
            paymentResponse
          );

          if (!verification.verified) {
            throw new Error(
              verification.message ||
                "Razorpay payment verification failed."
            );
          }

          paymentVerified = true;

          // Save paid order.
          await saveOrder({
            payment: RAZORPAY_KEY_ID.startsWith("rzp_live_") ? "Razorpay" : "Razorpay (Test Mode)",
            paymentStatus: "Paid",

            razorpayOrderId:
              paymentResponse.razorpay_order_id,

            razorpayPaymentId:
              paymentResponse.razorpay_payment_id,
          });
        } catch (paymentError) {
          console.error(
            "Payment verification/order error:",
            paymentError
          );

          if (paymentVerified) {
            setError(
              `Payment was verified, but the order could not be saved. Payment ID: ${paymentResponse.razorpay_payment_id}. Please contact the store before trying again.`
            );
          } else {
            setError(
              paymentError.message ||
                "Payment verification failed. Please contact the store if money was deducted."
            );
          }

          setBusy(false);
        }
      },

      modal: {
        ondismiss: () => {
          setBusy(false);
        },
      },
    };

    // Open Razorpay popup.
    const checkout = new window.Razorpay(options);

    checkout.on("payment.failed", (event) => {
      console.error("Razorpay payment failed:", event);

      setError(
        event.error?.description ||
          "Payment was not completed. Please try again."
      );

      setBusy(false);
    });

    checkout.open();
  };

  // ------------------------------------------------
  // PLACE ORDER
  // ------------------------------------------------

  const placeOrder = async (event) => {
    event.preventDefault();

    if (busy) return;

    setError("");
    setBusy(true);

    try {
      if (rows.length === 0) {
        throw new Error(
          "Your cart is empty or some products are unavailable."
        );
      }

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
          "Unable to place your order. Please try again."
      );

      setBusy(false);
    }
  };

  // ------------------------------------------------
  // COMMON INPUT STYLE
  // ------------------------------------------------

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  // ------------------------------------------------
  // LOGIN CHECK
  // ------------------------------------------------

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

  // ------------------------------------------------
  // SUCCESS SCREEN
  // ------------------------------------------------

  if (placedOrder) {
    return (
      <div className="mx-auto max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
        <div className="mb-3 text-5xl">✅</div>

        <h2 className="mb-2 text-2xl font-bold">
          Order placed successfully!
        </h2>

        <p className="mb-1 text-slate-600">
          Thank you for shopping with ShopSphere.
        </p>

        <p className="mb-6 text-sm text-slate-500">
          Order ID: {String(placedOrder.id)}
          {" • "}
          Total: {money(placedOrder.total)}
          {placedOrder.paymentStatus === "Paid"
            ? " • Paid"
            : ""}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/shop"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            Start Shopping
          </Link>

          <Link
            to="/orders"
            state={{ placed: placedOrder.id }}
            className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  // ------------------------------------------------
  // LOADING SCREEN
  // ------------------------------------------------

  if (loading) {
    return (
      <p className="py-10 text-center text-slate-600">
        Loading checkout...
      </p>
    );
  }

  // ------------------------------------------------
  // EMPTY CART SCREEN
  // ------------------------------------------------

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

  // ------------------------------------------------
  // CHECKOUT UI
  // ------------------------------------------------

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">
        Checkout
      </h2>

      <form
        onSubmit={placeOrder}
        className="grid gap-6 lg:grid-cols-3"
      >
        {/* DELIVERY DETAILS */}

        <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="font-semibold">
            Delivery details
          </h3>

          <input
            className={input}
            name="name"
            placeholder="Full name"
            required
            value={form.name}
            onChange={handleChange}
          />

          <input
            className={input}
            name="phone"
            placeholder="Phone number"
            type="tel"
            required
            pattern="[0-9]{10}"
            maxLength={10}
            title="Enter a 10 digit phone number"
            value={form.phone}
            onChange={handleChange}
          />

          <textarea
            className={input}
            name="address"
            rows="3"
            placeholder="Full delivery address"
            required
            value={form.address}
            onChange={handleChange}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className={input}
              name="city"
              placeholder="City"
              required
              value={form.city}
              onChange={handleChange}
            />

            <input
              className={input}
              name="pincode"
              placeholder="Pincode"
              required
              pattern="[0-9]{6}"
              maxLength={6}
              title="Enter a 6 digit pincode"
              value={form.pincode}
              onChange={handleChange}
            />
          </div>

          {/* PAYMENT METHOD */}

          <h3 className="pt-2 font-semibold">
            Payment method
          </h3>

          <select
            className={input}
            name="payment"
            value={form.payment}
            onChange={handleChange}
          >
            <option value="Cash on Delivery">
              Cash on Delivery
            </option>

            <option value="Razorpay Test Mode">
              Razorpay Test Mode
            </option>
          </select>

          {form.payment === "Razorpay Test Mode" ? (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Test Mode only: Use Razorpay test credentials.
              No real payment should be charged.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Pay when your order is delivered.
            </p>
          )}
        </div>

        {/* ORDER SUMMARY */}

        <div className="h-fit rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold">
            Order Summary
          </h3>

          <div className="space-y-3 text-sm">
            {rows.map((row) => (
              <div
                key={row.product.id}
                className="flex justify-between gap-3"
              >
                <span className="text-slate-600">
                  {row.product.name} × {row.qty}
                </span>

                <span className="font-medium">
                  {money(
                    Number(row.product.price) * row.qty
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between border-t pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>

          {/* ERROR MESSAGE */}

          {error && (
            <div
              role="alert"
              className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* PLACE ORDER BUTTON */}

          <button
            type="submit"
            disabled={busy || rows.length === 0}
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
