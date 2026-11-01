import { createContext, useContext, useState } from "react";
import api from "../../api/axios";

const AuthContext = createContext(null);
const KEY = "shopsphere_user";

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSaved);

  // Keep only safe fields (never the password) in the browser
  const saveUser = (u) => {
    const safe = { id: u.id, name: u.name, email: u.email };
    localStorage.setItem(KEY, JSON.stringify(safe));
    setUser(safe);
  };

  const signup = async ({ name, email, password }) => {
    const mail = email.trim().toLowerCase();
    const { data: found } = await api.get("/users", { params: { email: mail } });
    if (found.length) throw new Error("An account with this email already exists.");

    const { data } = await api.post("/users", {
      name: name.trim(),
      email: mail,
      password,
      phone: "",
      joinedAt: new Date().toISOString().slice(0, 10),
    });
    saveUser(data);
  };

  const login = async ({ email, password }) => {
    const mail = email.trim().toLowerCase();
    const { data } = await api.get("/users", { params: { email: mail } });
    const match = data.find((u) => u.password === password);
    if (!match) throw new Error("Wrong email or password.");
    saveUser(match);
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);