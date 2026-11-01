const BASE = "http://localhost:3000";
let pass = 0, fail = 0;

const check = (label, ok, extra = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} ${extra}`);
};

const call = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} returned ${res.status}`);
  return method === "DELETE" ? null : res.json();
};

const created = { user: null, cart: [], wish: [], order: null, product: null, originalStock: null };

try {
  // 1. Signup
  const email = `test${Date.now()}@mail.com`;
  const user = await call("POST", "/users", {
    name: "Test User", email, password: "secret1", phone: "", joinedAt: "2026-11-01",
  });
  created.user = user;
  check("Signup creates a user", !!user.id);

  const found = await call("GET", `/users?email=${email}`);
  check("User can be found by email (login lookup)", found.length === 1 && found[0].password === "secret1");

  // 2. Pick a product with stock
  const products = await call("GET", "/products");
  const product = products.find((p) => p.stock >= 3);
  check("A product with stock >= 3 exists", !!product);
  created.product = product;
  created.originalStock = product.stock;

  // 3. Cart and wishlist
  const cartRow = await call("POST", "/cart", { userId: user.id, productId: product.id, qty: 2 });
  created.cart.push(cartRow.id);
  const cart = await call("GET", `/cart?userId=${user.id}`);
  check("Add to cart saves a row for this user", cart.length === 1 && cart[0].qty === 2);

  await call("PATCH", `/cart/${cartRow.id}`, { qty: 3 });
  const cart2 = await call("GET", `/cart?userId=${user.id}`);
  check("Cart quantity can be updated", cart2[0].qty === 3);

  const wishRow = await call("POST", "/wishlist", { userId: user.id, productId: product.id });
  created.wish.push(wishRow.id);
  const wish = await call("GET", `/wishlist?userId=${user.id}`);
  check("Wishlist saves a row for this user", wish.length === 1);

  // 4. Checkout
  const items = [{ productId: product.id, qty: 3, price: product.price }];
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const order = await call("POST", "/orders", {
    customerId: user.id, date: "2026-11-01", status: "Pending", total, items,
  });
  created.order = order;
  check("Order is created", !!order.id);

  await call("PATCH", `/products/${product.id}`, { stock: product.stock - 3 });
  await call("DELETE", `/cart/${cartRow.id}`);
  created.cart = [];

  const after = await call("GET", `/products/${product.id}`);
  check("Stock goes down after the order", after.stock === created.originalStock - 3,
    `(${created.originalStock} -> ${after.stock})`);

  const emptyCart = await call("GET", `/cart?userId=${user.id}`);
  check("Cart is empty after checkout", emptyCart.length === 0);

  const mine = await call("GET", `/orders?customerId=${user.id}`);
  check("Order shows up in My Orders", mine.length === 1 && mine[0].total === total);

  // 5. Cancel and restore stock
  await call("PATCH", `/orders/${order.id}`, { status: "Cancelled" });
  await call("PATCH", `/products/${product.id}`, { stock: after.stock + 3 });
  const restored = await call("GET", `/products/${product.id}`);
  check("Stock is restored after cancel", restored.stock === created.originalStock);
} catch (e) {
  fail++;
  console.log("FAIL ", e.message);
} finally {
  // Clean up everything this test created
  try {
    if (created.order) await call("DELETE", `/orders/${created.order.id}`);
    for (const id of created.cart) await call("DELETE", `/cart/${id}`);
    for (const id of created.wish) await call("DELETE", `/wishlist/${id}`);
    if (created.user) await call("DELETE", `/users/${created.user.id}`);
    if (created.product) await call("PATCH", `/products/${created.product.id}`, { stock: created.originalStock });
    console.log("\nCleanup done. Your db.json is back to normal.");
  } catch (e) {
    console.log("\nCleanup problem:", e.message, "(check db.json for a Test User, cart or wishlist rows)");
  }
}

console.log(`${pass} passed, ${fail} failed`);