import axios from "axios";

const configuredBaseURL = (import.meta.env.VITE_API_URL || "").trim();

if (import.meta.env.PROD && !configuredBaseURL) {
  console.warn("VITE_API_URL is not set; falling back to localhost.");
}

const api = axios.create({
  baseURL: (configuredBaseURL || "http://localhost:3000").replace(/\/+$/, ""),
});

export default api;