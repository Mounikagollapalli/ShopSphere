import paymentHandler from "./[action].js";

export default function handler(req, res) {
  req.shopSphereAction = "verify";
  return paymentHandler(req, res);
}
