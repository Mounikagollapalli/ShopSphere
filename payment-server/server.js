import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import Razorpay from "razorpay";

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const DATA_URL = (
  process.env.JSON_SERVER_URL ||
  (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "")
).replace(/\/+$/, "");

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by ShopSphere CORS."));
    },
  })
);
app.use(express.json());

function razorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error("Payment server is missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.");
  }

  return new Razorpay({ key_id, key_secret });
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    dataConfigured: Boolean(DATA_URL),
    razorpayConfigured: Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ),
  });
});

app.post("/api/payments/create-order", async (req, res) => {
  try {
    if (!DATA_URL) {
      return res.status(503).json({
        message: "Payment server is missing JSON_SERVER_URL configuration.",
      });
    }

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty." });
    }

    const quantities = new Map();

    for (const item of req.body.items) {
      const id = String(item.productId || "");
      const qty = Number(item.qty);

      if (!id || !Number.isInteger(qty) || qty < 1 || qty > 20) {
        return res.status(400).json({ message: "Invalid cart item." });
      }

      quantities.set(id, (quantities.get(id) || 0) + qty);
    }

    let total = 0;

    for (const [id, qty] of quantities) {
      const response = await fetch(
        `${DATA_URL}/products/${encodeURIComponent(id)}`
      );

      if (!response.ok) {
        return res.status(400).json({ message: "Product not found in the catalog." });
      }

      const product = await response.json();
      const price = Number(product.price);
      const stock = Number(product.stock);

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ message: "Product has an invalid price." });
      }

      if (!Number.isFinite(stock) || stock < qty) {
        return res.status(409).json({
          message: `Only ${Number.isFinite(stock) ? stock : 0} of ${product.name || "this product"} are available.`,
        });
      }

      total += price * qty;
    }

    const amount = Math.round(total * 100);

    if (!Number.isSafeInteger(amount) || amount < 100) {
      return res.status(400).json({ message: "Invalid payment amount." });
    }

    const order = await razorpayClient().orders.create({
      amount,
      currency: "INR",
      receipt: `shopsphere_${Date.now()}`,
    });

    return res.status(201).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Create order error:", error.message);
    return res.status(500).json({
      message: "Could not create the Razorpay order. Check payment server configuration.",
    });
  }
});

app.post("/api/payments/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        verified: false,
        message: "Missing payment verification details.",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const expected = Buffer.from(expectedSignature);
    const received = Buffer.from(razorpay_signature);
    const signatureValid =
      expected.length === received.length &&
      crypto.timingSafeEqual(expected, received);

    if (!signatureValid) {
      return res.status(400).json({
        verified: false,
        message: "Invalid Razorpay payment signature.",
      });
    }

    const client = razorpayClient();
    const [payment, order] = await Promise.all([
      client.payments.fetch(razorpay_payment_id),
      client.orders.fetch(razorpay_order_id),
    ]);

    if (
      payment.order_id !== order.id ||
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured" ||
      payment.amount !== order.amount ||
      payment.currency !== order.currency
    ) {
      return res.status(400).json({
        verified: false,
        message: "Razorpay payment is not captured or does not match the order.",
      });
    }

    return res.json({ verified: true });
  } catch (error) {
    console.error("Payment verification error:", error.message);
    return res.status(500).json({
      verified: false,
      message: "Could not verify payment with Razorpay. Please contact the store before retrying.",
    });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`ShopSphere payment API running on port ${PORT}`);
  });
}

export default app;
