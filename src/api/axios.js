import axios from "axios";

const configuredBaseURL = (import.meta.env.VITE_API_URL || "").trim();

const api = axios.create({
  // Local development uses JSON Server on port 3000.
  // Production must always use the deployed JSON Server URL.
  baseURL: configuredBaseURL || (import.meta.env.DEV ? "http://localhost:3000" : ""),
});

if (import.meta.env.PROD && !configuredBaseURL) {
  console.error(
    "ShopSphere configuration error: VITE_API_URL must point to the deployed JSON Server."
  );
}

export default api;
