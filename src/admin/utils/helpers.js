export const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

export const validOrders = (orders) => orders.filter((o) => o.status !== "Cancelled");

const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return new Date(y, m - 1).toLocaleString("en-US", { month: "short", year: "2-digit" });
};

// Monthly revenue
export const revenueByMonth = (orders) => {
  const map = {};
  validOrders(orders).forEach((o) => {
    const k = o.date.slice(0, 7);
    map[k] = (map[k] || 0) + Number(o.total);
  });
  return Object.keys(map).sort().map((k) => ({ month: monthLabel(k), revenue: map[k] }));
};

// Monthly orders
export const ordersByMonth = (orders) => {
  const map = {};
  orders.forEach((o) => {
    const k = o.date.slice(0, 7);
    map[k] = (map[k] || 0) + 1;
  });
  return Object.keys(map).sort().map((k) => ({ month: monthLabel(k), orders: map[k] }));
};

// Daily orders (last 14 days that have orders)
export const ordersByDay = (orders) => {
  const map = {};
  orders.forEach((o) => {
    map[o.date] = (map[o.date] || 0) + 1;
  });
  return Object.keys(map).sort().slice(-14).map((d) => ({ day: d.slice(5), orders: map[d] }));
};

// Best-selling products
export const bestSelling = (orders, products, limit = 5) => {
  const map = {};
  validOrders(orders).forEach((o) =>
    o.items.forEach((i) => {
      const m = map[i.productId] || { qty: 0, revenue: 0 };
      m.qty += i.qty;
      m.revenue += i.qty * i.price;
      map[i.productId] = m;
    })
  );
  return Object.entries(map)
    .map(([id, v]) => {
      const p = products.find((x) => String(x.id) === String(id));
      return { name: p ? p.name : "Deleted product", ...v };
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
};

// Category-wise sales
export const categorySales = (orders, products, categories) => {
  const map = {};
  validOrders(orders).forEach((o) =>
    o.items.forEach((i) => {
      const p = products.find((x) => String(x.id) === String(i.productId));
      const c = categories.find((x) => String(x.id) === String(p?.categoryId));
      const name = c ? c.name : "Other";
      map[name] = (map[name] || 0) + i.qty * i.price;
    })
  );
  return Object.entries(map).map(([name, value]) => ({ name, value }));
};

// Customer growth (cumulative)
export const customerGrowth = (customers) => {
  const map = {};
  customers
    .filter((c) => c.joinedAt)
    .forEach((c) => {
      const k = c.joinedAt.slice(0, 7);
      map[k] = (map[k] || 0) + 1;
    });
  let total = 0;
  return Object.keys(map).sort().map((k) => {
    total += map[k];
    return { month: monthLabel(k), customers: total };
  });
};