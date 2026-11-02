import axios from "axios";

const configuredBaseURL = (import.meta.env.VITE_API_URL || "").trim();

const api = axios.create({
  baseURL: (configuredBaseURL || "http://localhost:3000").replace(/\/+$/, ""),
});

export default api;