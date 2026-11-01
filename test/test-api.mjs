const BASE = "http://localhost:3000";
let pass = 0, fail = 0;

const check = (label, ok, extra = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} ${extra}`);
};

const get = async (path) => {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
};

try {
  // 1. Every collection exists and is a list
  const data = {};
  for (const name of ["categories", "products", "users", "orders", "cart", "wishlist"]) {
    try {
      data[name] = await get("/" + name);
      check(`/${name} is a list`, Array.isArray(data[name]), `(${data[name].length} items)`);
    } catch (e) {
      check(`/${name} exists`, false, e.message);
    }
  }

  const { categories = [], products = [], users = [], orders = [] } = data;

  // 2. Product fields
  const badProducts = products.filter(
    (p) => !p.name || typeof p.price !== "number" || typeof p.stock !== "number" || !p.categoryId
  );
  check("All products have name, price, stock, categoryId", badProducts.length === 0,
    badProducts.length ? `-> bad ids: ${badProducts.map((p) => p.id).join(", ")}` : "");

  // 3. Products point to a real category
  const noCat = products.filter((p) => !categories.some((c) => String(c.id) === String(p.categoryId)));
  check("Every product has a valid category", noCat.length === 0,
    noCat.length ? `-> ${noCat.map((p) => p.name).join(", ")}` : "");

  // 4. Images are direct links, not Google search pages
  const badImg = products.filter((p) => p.image && p.image.includes("google.com/search"));
  check("No product uses a Google search link as image", badImg.length === 0,
    badImg.length ? `-> ${badImg.map((p) => p.name).join(", ")}` : "");

  // 5. Orders: customer exists, products exist, total matches items
  const badOrders = orders.filter((o) => {
    const userOk = users.some((u) => String(u.id) === String(o.customerId));
    const itemsOk = Array.isArray(o.items) && o.items.every((i) =>
      products.some((p) => String(p.id) === String(i.productId)));
    const sum = (o.items || []).reduce((s, i) => s + i.qty * i.price, 0);
    return !userOk || !itemsOk || sum !== Number(o.total) || !/^\d{4}-\d{2}-\d{2}$/.test(o.date);
  });
  check("All orders are valid (customer, items, total, date)", badOrders.length === 0,
    badOrders.length ? `-> order ids: ${badOrders.map((o) => o.id).join(", ")}` : "");

  // 6. Create / update / delete round trip
  const created = await fetch(BASE + "/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "__test__" }),
  }).then((r) => r.json());
  check("POST creates a category", !!created.id);

  const patched = await fetch(`${BASE}/categories/${created.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "__test_updated__" }),
  }).then((r) => r.json());
  check("PATCH updates it", patched.name === "__test_updated__");

  const del = await fetch(`${BASE}/categories/${created.id}`, { method: "DELETE" });
  check("DELETE removes it", del.ok);
} catch (e) {
  fail++;
  console.log("FAIL  Could not reach JSON Server:", e.message);
}

console.log(`\n${pass} passed, ${fail} failed`);