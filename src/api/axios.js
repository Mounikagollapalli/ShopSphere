import axios, { AxiosError } from "axios";
import catalog from "../data/catalog.json";

const STORAGE_KEY = "shopsphere_demo_database_v1";
const initialDatabase = {
  products: catalog.products,
  categories: catalog.categories,
  users: [],
  cart: [],
  wishlist: [],
  orders: [],
};

let memoryDatabase = null;

function readDatabase() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...initialDatabase,
        ...parsed,
        products: Array.isArray(parsed.products) ? parsed.products : initialDatabase.products,
        categories: Array.isArray(parsed.categories) ? parsed.categories : initialDatabase.categories,
      };
    }
  } catch (error) {
    console.warn("ShopSphere local data could not be read:", error);
  }
  return memoryDatabase || structuredClone(initialDatabase);
}

function saveDatabase(database) {
  memoryDatabase = database;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch (error) {
    console.warn("ShopSphere local data could not be saved:", error);
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function localAdapter(config) {
  return Promise.resolve().then(() => {
    const method = (config.method || "get").toUpperCase();
    const path = decodeURIComponent((config.url || "").split("?")[0])
      .replace(/^\/+|\/+$/g, "");
    const [rawCollection, ...idParts] = path.split("/");
    const collection = rawCollection === "customers" ? "users" : rawCollection;
    const id = idParts.length ? idParts.join("/") : null;
    const database = readDatabase();
    const body = typeof config.data === "string" ? JSON.parse(config.data) : (config.data || {});

    if (!Object.prototype.hasOwnProperty.call(database, collection) ||
        !Array.isArray(database[collection])) {
      throw new AxiosError(`Unknown ShopSphere data collection: ${collection}`, "ERR_BAD_REQUEST", config);
    }

    let status = 200;
    let data;
    const records = database[collection];

    if (method === "GET") {
      if (id !== null) {
        data = records.find((item) => String(item.id) === String(id));
        if (!data) status = 404;
      } else {
        data = [...records];
        const params = config.params || {};
        for (const [key, value] of Object.entries(params)) {
          if (key === "_sort" || key === "_order" || key === "_page" || key === "_limit") continue;
          data = data.filter((item) => String(item[key] ?? "") === String(value));
        }
        if (params._sort) {
          const key = params._sort;
          const direction = params._order === "desc" ? -1 : 1;
          data.sort((a, b) => (a[key] > b[key] ? direction : a[key] < b[key] ? -direction : 0));
        }
        if (params._page || params._limit) {
          const limit = Math.max(1, Number(params._limit) || data.length || 1);
          const page = Math.max(1, Number(params._page) || 1);
          data = data.slice((page - 1) * limit, page * limit);
        }
      }
    } else if (method === "POST") {
      const record = { ...body };
      if (record.id === undefined || record.id === null) record.id = makeId();
      records.push(record);
      data = record;
      status = 201;
      saveDatabase(database);
    } else if (method === "PATCH" || method === "PUT") {
      const index = records.findIndex((item) => String(item.id) === String(id));
      if (index < 0) {
        status = 404;
      } else {
        records[index] = method === "PATCH"
          ? { ...records[index], ...body }
          : { ...body, id: records[index].id };
        data = records[index];
        saveDatabase(database);
      }
    } else if (method === "DELETE") {
      const index = records.findIndex((item) => String(item.id) === String(id));
      if (index < 0) {
        status = 404;
      } else {
        data = records[index];
        records.splice(index, 1);
        status = 200;
        saveDatabase(database);
      }
    } else {
      status = 405;
    }

    const response = {
      data: status >= 400 ? { message: status === 404 ? "Record not found." : "Request not supported." } : data,
      status,
      statusText: status >= 400 ? "Error" : "OK",
      headers: {},
      config,
      request: null,
    };

    const validateStatus = config.validateStatus || ((value) => value >= 200 && value < 300);
    if (!validateStatus(status)) {
      throw new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, null, response);
    }
    return response;
  });
}

// ShopSphere demo data is stored in this browser. No sleeping JSON Server is required.
const api = axios.create({ adapter: localAdapter });

export default api;
