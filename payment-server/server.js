import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import catalog from "./catalog.json" with { type: "json" };

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const PRODUCTS = Array.isArray(catalog.products) ? catalog.products : [];

const configuredOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = new Set(configuredOrigins);

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (allowedOrigins.has(origin)) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    // Allow this application's Vercel production and preview deployments.
    // Custom domains must be added to FRONTEND_URL in Render.
    return (
      url.protocol === "https:" &&
      hostname.endsWith(".vercel.app") &&
      (hostname === "shopsphere.vercel.app" ||
        hostname.startsWith("shopsphere-"))
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      // Do not throw for an unapproved browser origin. Returning false avoids
      // turning a CORS rejection into an Express 500/502 response.
      callback(null, isAllowedOrigin(origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

app.use(express.json({ limit: "100kb" }));

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        type: "http_request",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      })
    );
  });
  next();
});

function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    const error = new Error("Razorpay credentials are not configured on the payment server.");
    error.statusCode = 503;
    throw error;
  }

  return new Razorpay({ key_id, key_secret });
}

function withTimeout(promise, timeoutMs, label) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => {
        const error = new Error(label + " timed out.");
        error.code = "ETIMEDOUT";
        reject(error);
      }, timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeout));
}

function fetchProduct(productId) {
  return PRODUCTS.find((product) => String(product.id) === String(productId)) || null;
}

function sendError(res, error, fallbackMessage) {
  const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;

  console.error(
    JSON.stringify({
      type: "api_error",
      message: error?.message || fallbackMessage,
      code: error?.code || null,
      status,
    })
  );

  return res.status(status).json({
    ok: false,
    message: status >= 500 ? fallbackMessage : error.message,
  });
}

// Liveness endpoint: this confirms the Node process is responding.
// It deliberately does not depend on Razorpay or the data service.
const healthHandler = (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "shopsphere-payment",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    catalogConfigured: PRODUCTS.length > 0,
    razorpayConfigured: Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ),
  });
};

app.get("/api/health", healthHandler);
// A simple root response also makes basic platform probes succeed.
app.get("/", healthHandler);

app.post("/api/payments/create-order", async (req, res) => {
  try {
    if (!Array.isArray(req.body?.items) || req.body.items.length === 0) {
      return res.status(400).json({ ok: false, message: "Cart is empty." });
    }

    const quantities = new Map();

    for (const item of req.body.items) {
      const id = String(item?.productId ?? "").trim();
      const qty = Number(item?.qty);

      if (!id || !Number.isInteger(qty) || qty < 1 || qty > 20) {
        return res.status(400).json({ ok: false, message: "Invalid cart item." });
      }

      const combinedQty = (quantities.get(id) || 0) + qty;
      if (combinedQty > 20) {
        return res.status(400).json({ ok: false, message: "Maximum quantity per product is 20." });
      }
      quantities.set(id, combinedQty);
    }

    let total = 0;

    for (const [id, qty] of quantities) {
      const product = await fetchProduct(id);

      if (!product) {
        return res.status(400).json({ ok: false, message: "Product not found in the catalog." });
      }

      const price = Number(product.price);
      const stock = Number(product.stock);

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ ok: false, message: "Product has an invalid price." });
      }

      if (!Number.isFinite(stock) || stock < qty) {
        return res.status(409).json({
          ok: false,
          message: "Only " + (Number.isFinite(stock) ? stock : 0) +
            " of " + (product.name || "this product") + " are available.",
        });
      }

      total += price * qty;
    }

    const amount = Math.round(total * 100);

    if (!Number.isSafeInteger(amount) || amount < 100) {
      return res.status(400).json({ ok: false, message: "Invalid payment amount." });
    }

    const client = getRazorpayClient();
    const order = await withTimeout(
      client.orders.create({
        amount,
        currency: "INR",
        receipt: "shopsphere_" + Date.now(),
      }),
      15000,
      "Razorpay order creation"
    );

    return res.status(201).json({
      ok: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    return sendError(res, error, "Could not create the Razorpay order. The payment service may be temporarily unavailable. Please try again.");
  }
});

app.post("/api/payments/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        ok: false,
        verified: false,
        message: "Missing payment verification details.",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    const expected = Buffer.from(expectedSignature, "hex");
    const received = Buffer.from(String(razorpay_signature), "hex");

    const signatureValid =
      expected.length === received.length &&
      expected.length > 0 &&
      crypto.timingSafeEqual(expected, received);

    if (!signatureValid) {
      return res.status(400).json({
        ok: false,
        verified: false,
        message: "Invalid Razorpay payment signature.",
      });
    }

    const client = getRazorpayClient();
    const [payment, order] = await withTimeout(
      Promise.all([
        client.payments.fetch(razorpay_payment_id),
        client.orders.fetch(razorpay_order_id),
      ]),
      15000,
      "Razorpay payment verification"
    );

    if (
      payment.order_id !== order.id ||
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured" ||
      payment.amount !== order.amount ||
      payment.currency !== order.currency
    ) {
      return res.status(400).json({
        ok: false,
        verified: false,
        message: "Payment is not captured or does not match the Razorpay order.",
      });
    }

    return res.json({ ok: true, verified: true });
  } catch (error) {
    return sendError(res, error, "Could not verify the payment with Razorpay. Check the payment status before trying again.");
  }
});

// Consistent JSON responses for malformed JSON and unexpected Express errors.
app.use((error, _req, res, _next) => {
  const status = error?.type === "entity.parse.failed" ? 400 : 500;
  console.error("Unhandled request error:", error?.message || error);
  if (res.headersSent) return;
  res.status(status).json({
    ok: false,
    message: status === 400 ? "Request body contains invalid JSON." : "Unexpected payment server error.",
  });
});

if (!process.env.VERCEL) {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("ShopSphere payment API running on port " + PORT);
  });

  server.keepAliveTimeout = 5000;
  server.headersTimeout = 65000;
  server.requestTimeout = 30000;

  const shutdown = (signal) => {
    console.log(signal + " received. Closing ShopSphere payment API.");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

export default app;
