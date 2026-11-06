import crypto from "node:crypto";

const json = (res, status, body) => res.status(status).json(body);

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, message: "Method not allowed." });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const dataUrl = (process.env.JSON_SERVER_URL || "").replace(/\/+$/, "");

  if (!keyId || !keySecret) return json(res, 503, { ok: false, message: "Razorpay credentials are not configured in Vercel." });
  if (!dataUrl) return json(res, 503, { ok: false, message: "Product data service is not configured." });

  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    return json(res, 400, { ok: false, message: "Your cart is empty or invalid." });
  }

  try {
    const quantities = new Map();
    for (const item of items) {
      const id = String(item?.productId ?? "").trim();
      const qty = Number(item?.qty);
      if (!id || !Number.isInteger(qty) || qty < 1 || qty > 20) {
        return json(res, 400, { ok: false, message: "Invalid cart item." });
      }
      quantities.set(id, (quantities.get(id) || 0) + qty);
      if (quantities.get(id) > 20) return json(res, 400, { ok: false, message: "Maximum quantity per product is 20." });
    }

    let total = 0;
    for (const [id, qty] of quantities) {
      const response = await fetch(`${dataUrl}/products/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return json(res, response.status === 404 ? 400 : 502, { ok: false, message: "Could not validate a cart product. Please refresh and try again." });
      const product = await response.json();
      const price = Number(product.price);
      const stock = Number(product.stock);
      if (!Number.isFinite(price) || price <= 0) return json(res, 400, { ok: false, message: "A product has an invalid price." });
      if (Number.isFinite(stock) && stock < qty) return json(res, 409, { ok: false, message: `Only ${stock} units of ${product.name || "this product"} are available.` });
      total += price * qty;
    }

    const amount = Math.round(total * 100);
    if (!Number.isSafeInteger(amount) || amount < 100) return json(res, 400, { ok: false, message: "Invalid payment amount." });

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency: "INR", receipt: "shopsphere_" + Date.now() }),
      signal: AbortSignal.timeout(15000),
    });
    const order = await response.json();
    if (!response.ok || !order.id) {
      console.error("Razorpay create-order failed:", response.status, order?.error?.code || "unknown");
      return json(res, 502, { ok: false, message: "Razorpay could not create the order. Please try again." });
    }
    return json(res, 201, { ok: true, id: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error("ShopSphere create-order error:", error?.message || error);
    return json(res, 502, { ok: false, message: "Payment service is temporarily unavailable. Please try again." });
  }
}
