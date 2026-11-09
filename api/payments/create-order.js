import paymentHandler from "./[action].js";

export default function handler(req, res) {
  req.shopSphereAction = "create-order";
  return paymentHandler(req, res);
}
