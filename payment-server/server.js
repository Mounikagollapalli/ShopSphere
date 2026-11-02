
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.use(express.json());

// Environment variables
const PORT = process.env.PORT || 5000;
const JSON_SERVER_URL =
  process.env.JSON_SERVER_URL || "http://localhost:3000";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Validate credentials
if (!KEY_ID || !KEY_SECRET) {
  console.error("Razorpay credentials are missing in .env");
  process.exit(1);
}

// Razorpay instance
const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "ShopSphere payment API running",
    status: "success",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "success" });
});

// Create Razorpay order
app.post("/api/payments/create-order", async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Cart items are required.",
      });
    }

    const quantities = new Map();
    for (const item of items) {
      if (
        !item ||
        !["string", "number"].includes(typeof item.productId) ||
        String(item.productId).trim() === ""
      ) {
        return res.status(400).json({ message: "Invalid product." });
      }

      const qty = Number(item.qty);
      if (!Number.isSafeInteger(qty) || qty < 1) {
        return res.status(400).json({
          message: "Invalid product quantity.",
        });
      }

      const productId = String(item.productId);
      const combinedQty = (quantities.get(productId) || 0) + qty;
      if (!Number.isSafeInteger(combinedQty)) {
        return res.status(400).json({
          message: "Invalid product quantity.",
        });
      }
      quantities.set(productId, combinedQty);
    }

    let total = 0;

    // Always fetch product prices from JSON Server
    for (const [productId, qty] of quantities) {
      let response;
      try {
        response = await fetch(
          `${JSON_SERVER_URL}/products/${encodeURIComponent(productId)}`,
          { signal: AbortSignal.timeout(8000) }
        );
      } catch (error) {
        console.error("Product database request failed:", error);
        return res.status(503).json({
          message: `Could not reach the product database at ${JSON_SERVER_URL}. Start JSON Server and confirm JSON_SERVER_URL is correct.`,
        });
      }

      if (!response.ok) {
        return res.status(404).json({
          message: `Product ${productId} not found.`,
        });
      }

      const product = await response.json();

      const stock = Number(product.stock);
      if (!Number.isSafeInteger(stock) || stock < qty) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}.`,
        });
      }

      const price = Number(product.price);

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({
          message: `Invalid price for ${product.name}.`,
        });
      }

      total += price * qty;
    }

    // Convert INR to paise
    const amount = Math.round(total * 100);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Invalid payment amount.",
      });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `shop_${Date.now()}`,
      notes: {
        store: "ShopSphere",
      },
    });

    return res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      message:
        error.error?.description ||
        error.message ||
        "Failed to create Razorpay order.",
    });
  }
});

// Verify Razorpay payment
app.post("/api/payments/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      typeof razorpay_order_id !== "string" ||
      !razorpay_order_id ||
      typeof razorpay_payment_id !== "string" ||
      !razorpay_payment_id ||
      typeof razorpay_signature !== "string" ||
      !/^[a-f\d]{64}$/i.test(razorpay_signature)
    ) {
      return res.status(400).json({
        verified: false,
        message: "Payment verification details are missing.",
      });
    }

    // Generate expected signature
    const body =
      `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(body)
      .digest("hex");

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "hex"
    );

    const receivedBuffer = Buffer.from(
      razorpay_signature,
      "hex"
    );

    // Compare signatures safely
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      )
    ) {
      return res.status(400).json({
        verified: false,
        message: "Invalid Razorpay payment signature.",
      });
    }

    // Verify payment details with Razorpay API
    const payment = await razorpay.payments.fetch(
      razorpay_payment_id
    );
    const order = await razorpay.orders.fetch(razorpay_order_id);

    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured" ||
      payment.currency !== "INR" ||
      order.currency !== "INR" ||
      payment.amount !== order.amount
    ) {
      return res.status(400).json({
        verified: false,
        message: "Payment is not successfully captured.",
      });
    }

    return res.status(200).json({
      verified: true,
      message: "Payment verified successfully.",
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      verified: false,
      message:
        error.error?.description ||
        error.message ||
        "Payment verification failed.",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(
    `ShopSphere payment API running on ${PORT}`
  );
});
