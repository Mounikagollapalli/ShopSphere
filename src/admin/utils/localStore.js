import catalog from "../../customer/catalog.json";

const KEYS = {
  products: "shopsphere_admin_products",
  categories: "shopsphere_admin_categories",
  customers: "shopsphere_admin_customers",
  orders: "shopsphere_guest_orders",
};

const demoCustomers = [
  { id: "C101", name: "Rupa", email: "rupa@gmail.com", phone: "", joinedAt: "2026-01-12" },
  { id: "C102", name: "Swaroopa", email: "swaroopa@gmail.com", phone: "", joinedAt: "2026-02-15" },
  { id: "C103", name: "Nitin", email: "nitin@gmail.com", phone: "", joinedAt: "2026-03-10" },
  { id: "C104", name: "Likhit", email: "likhit@gmail.com", phone: "", joinedAt: "2026-04-18" },
  { id: "C105", name: "XYZ", email: "xyz@gmail.com", phone: "", joinedAt: "2026-05-20" },
  { id: "C106", name: "Priya", email: "priya@gmail.com", phone: "", joinedAt: "2026-06-22" },
];

function readList(key, fallback = []) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("shopsphere:data-updated"));
  return value;
}

export function readShopData() {
  return {
    products: readList(KEYS.products, catalog.products || []),
    categories: readList(KEYS.categories, catalog.categories || []),
    customers: readList(KEYS.customers, demoCustomers),
    orders: readList(KEYS.orders, []),
  };
}

function nextId(items) {
  const numericIds = items
    .map((item) => Number(item.id))
    .filter((id) => Number.isFinite(id));
  return String(Math.max(0, ...numericIds) + 1);
}

export function saveProduct(product) {
  const products = readList(KEYS.products, catalog.products || []);
  const exists = product.id !== undefined && products.some(
    (item) => String(item.id) === String(product.id)
  );
  const saved = exists
    ? products.map((item) => String(item.id) === String(product.id) ? { ...item, ...product } : item)
    : [...products, {
        id: nextId(products),
        brand: "",
        discount: 0,
        rating: 4.5,
        description: "",
        ...product,
      }];
  writeList(KEYS.products, saved);
  return saved;
}

export function deleteProduct(id) {
  const products = readList(KEYS.products, catalog.products || []);
  return writeList(KEYS.products, products.filter((item) => String(item.id) !== String(id)));
}

export function saveCategory(category) {
  const categories = readList(KEYS.categories, catalog.categories || []);
  const exists = category.id !== undefined && categories.some(
    (item) => String(item.id) === String(category.id)
  );
  const saved = exists
    ? categories.map((item) => String(item.id) === String(category.id) ? { ...item, ...category } : item)
    : [...categories, { id: nextId(categories), ...category }];
  writeList(KEYS.categories, saved);
  return saved;
}

export function deleteCategory(id) {
  const categories = readList(KEYS.categories, catalog.categories || []);
  return writeList(KEYS.categories, categories.filter((item) => String(item.id) !== String(id)));
}

export function updateProductStock(id, stock) {
  const products = readList(KEYS.products, catalog.products || []);
  return writeList(KEYS.products, products.map((item) =>
    String(item.id) === String(id) ? { ...item, stock: Number(stock) } : item
  ));
}

export function saveCustomer(customer) {
  const customers = readList(KEYS.customers, demoCustomers);
  const saved = customers.map((item) =>
    String(item.id) === String(customer.id) ? { ...item, ...customer } : item
  );
  return writeList(KEYS.customers, saved);
}
