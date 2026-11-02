import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import Razorpay from "razorpay";

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const DATA_URL = (process.env.JSON_SERVER_URL || "http://localhost:3000").replace(/\/$/, "");
const origins = (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map((v) => v.trim());

app.use(cors({ origin: origins }));
app.use(express.json());

function razorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error("Set Razorpay test keys in payment-server/.env");
  return new Razorpay({ key_id, key_secret });
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/payments/create-order", async (req, res) => {
  try {
    if (!Array.isArray(req.body.items) || !req.body.items.length) {
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
      const response = await fetch(`${DATA_URL}/products/${encodeURIComponent(id)}`);
      if (!response.ok) return res.status(400).json({ message: "Product not found." });
      const product = await response.json();
      const price = Number(product.price);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ message: "Invalid product price." });
      }
      if (Number(product.stock) < qty) {
        return res.status(409).json({ message: `Only ${product.stock} of ${product.name} are available.` });
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
    return res.status(201).json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error("Create order error:", error.message);
    return res.status(500).json({ message: error.message || "Could not create payment order." });
  }
});

app.post("/api/payments/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, message: "Missing payment verification details." });
  }

  const signature = crypto.createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(razorpay_signature);
  const verified = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!verified) return res.status(400).json({ verified: false, message: "Invalid payment signature." });
  return res.json({ verified: true });
});

app.listen(PORT, () => console.log(`ShopSphere payment API running on ${PORT}`));
