import crypto from "node:crypto";
import catalog from "../../payment-server/catalog.json" with { type: "json" };

const products = Array.isArray(catalog.products) ? catalog.products : [];

function send(res, status, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(payload);
}

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!keyId || !keySecret) {
    const error = new Error("Razorpay credentials are not configured in Vercel.");
    error.statusCode = 503;
    throw error;
  }
  return { keyId, keySecret };
}

async function razorpayRequest(path, { method = "GET", body, keyId, keySecret }) {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(12000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.description || "Razorpay could not process the request.");
    error.statusCode = response.status === 429 ? 503 : 502;
    throw error;
  }
  return data;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return { error: "Your cart is empty or invalid." };
  }

  const quantities = new Map();
  for (const item of items) {
    const id = String(item?.productId ?? "").trim();
    const qty = Number(item?.qty);
    if (!id || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      return { error: "Invalid cart item. Please update your cart." };
    }
    const combined = (quantities.get(id) || 0) + qty;
    if (combined > 20) {
      return { error: "Maximum quantity per product is 20." };
    }
    quantities.set(id, combined);
  }
  return { quantities };
}

async function createOrder(req, res) {
  const normalized = normalizeItems(req.body?.items);
  if (normalized.error) return send(res, 400, { ok: false, message: normalized.error });

  let totalRupees = 0;
  for (const [id, qty] of normalized.quantities) {
    const product = products.find((item) => String(item.id) === id);
    if (!product) return send(res, 400, { ok: false, message: "A product in your cart is no longer available." });

    const price = Number(product.price);
    const stock = Number(product.stock);
    if (!Number.isFinite(price) || price <= 0) {
      return send(res, 400, { ok: false, message: "A product has an invalid price. Please contact the store." });
    }
    if (!Number.isFinite(stock) || stock < qty) {
      return send(res, 409, { ok: false, message: `Only ${Number.isFinite(stock) ? stock : 0} units of ${product.name || "this product"} are available.` });
    }
    totalRupees += price * qty;
  }

  const amount = Math.round(totalRupees * 100);
  if (!Number.isSafeInteger(amount) || amount < 100) {
    return send(res, 400, { ok: false, message: "The payment amount is invalid." });
  }

  const { keyId, keySecret } = credentials();
  const order = await razorpayRequest("orders", {
    method: "POST",
    keyId,
    keySecret,
    body: {
      amount,
      currency: "INR",
      receipt: `ss_${Date.now()}`,
    },
  });

  return send(res, 201, {
    ok: true,
    id: order.id,
    amount: order.amount,
    currency: order.currency,
  });
}

async function verifyPayment(req, res) {
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body || {};

  if (!orderId || !paymentId || !signature) {
    return send(res, 400, { ok: false, verified: false, message: "Missing payment verification details." });
  }

  const { keyId, keySecret } = credentials();
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  let expected;
  let received;
  try {
    expected = Buffer.from(expectedSignature, "hex");
    received = Buffer.from(String(signature), "hex");
  } catch {
    return send(res, 400, { ok: false, verified: false, message: "Invalid payment signature." });
  }

  if (expected.length !== received.length || expected.length === 0 || !crypto.timingSafeEqual(expected, received)) {
    return send(res, 400, { ok: false, verified: false, message: "Invalid Razorpay payment signature." });
  }

  const [payment, order] = await Promise.all([
    razorpayRequest(`payments/${encodeURIComponent(paymentId)}`, { keyId, keySecret }),
    razorpayRequest(`orders/${encodeURIComponent(orderId)}`, { keyId, keySecret }),
  ]);

  if (
    payment.order_id !== order.id ||
    payment.order_id !== orderId ||
    payment.status !== "captured" ||
    payment.amount !== order.amount ||
    payment.currency !== order.currency
  ) {
    return send(res, 400, {
      ok: false,
      verified: false,
      message: "Payment is not captured or does not match the Razorpay order.",
    });
  }

  return send(res, 200, { ok: true, verified: true });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { ok: false, message: "Method not allowed." });
  }

  try {
    const action = String(req.shopSphereAction || req.query?.action || "");
    if (action === "create-order") return await createOrder(req, res);
    if (action === "verify") return await verifyPayment(req, res);
    return send(res, 404, { ok: false, message: "Payment endpoint not found." });
  } catch (error) {
    console.error("ShopSphere payment API error:", {
      message: error?.message || "Unknown error",
      statusCode: error?.statusCode || 500,
    });
    const status = Number.isInteger(error?.statusCode) ? error.statusCode : 502;
    return send(res, status, {
      ok: false,
      message: status === 503
        ? "Payment service is not configured. Please contact the store."
        : "Razorpay could not complete the request. Please try again.",
    });
  }
}
