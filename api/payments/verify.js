import crypto from "node:crypto";

const json = (res, status, body) => res.status(status).json(body);

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, verified: false, message: "Method not allowed." });

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};

  if (!keyId || !keySecret) return json(res, 503, { ok: false, verified: false, message: "Razorpay credentials are not configured in Vercel." });
  if (!orderId || !paymentId || !signature) return json(res, 400, { ok: false, verified: false, message: "Missing payment verification details." });

  try {
    const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest();
    const received = Buffer.from(String(signature), "hex");
    if (received.length !== expected.length || !crypto.timingSafeEqual(expected, received)) {
      return json(res, 400, { ok: false, verified: false, message: "Payment signature is invalid." });
    }

    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64") },
      signal: AbortSignal.timeout(15000),
    });
    const payment = await response.json();
    if (!response.ok || payment.order_id !== orderId || payment.status !== "captured") {
      return json(res, 400, { ok: false, verified: false, message: "Razorpay has not confirmed a captured payment for this order." });
    }
    return json(res, 200, { ok: true, verified: true });
  } catch (error) {
    console.error("ShopSphere payment verification error:", error?.message || error);
    return json(res, 502, { ok: false, verified: false, message: "Could not verify payment with Razorpay. Please check payment status before retrying." });
  }
}
