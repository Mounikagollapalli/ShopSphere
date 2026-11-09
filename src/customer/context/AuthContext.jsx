import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);
const SESSION_KEY = "shopsphere_user";
const USERS_KEY = "shopsphere_demo_users";

function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

async function hashPassword(password, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSaved);

  const saveUser = (record) => {
    const safe = { id: record.id, name: record.name, email: record.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    setUser(safe);
  };

  const signup = async ({ name, email, password }) => {
    const cleanName = String(name || "").trim();
    const mail = String(email || "").trim().toLowerCase();
    const pass = String(password || "");

    if (!cleanName || !mail || pass.length < 6) {
      throw new Error("Enter your name, a valid email, and a password with at least 6 characters.");
    }

    const users = readUsers();
    if (users.some((record) => record.email === mail)) {
      throw new Error("An account with this email already exists in this browser.");
    }

    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, "0")).join("");
    const record = {
      id: `SSU-${Date.now()}`,
      name: cleanName,
      email: mail,
      salt,
      passwordHash: await hashPassword(pass, salt),
      joinedAt: new Date().toISOString().slice(0, 10),
    };

    try {
      localStorage.setItem(USERS_KEY, JSON.stringify([...users, record]));
      saveUser(record);
    } catch {
      throw new Error("Your account could not be saved in this browser. Check available storage and try again.");
    }
  };

  const login = async ({ email, password }) => {
    const mail = String(email || "").trim().toLowerCase();
    const pass = String(password || "");
    const record = readUsers().find((item) => item.email === mail);
    const candidateHash = record ? await hashPassword(pass, record.salt) : "";

    if (!record || candidateHash !== record.passwordHash) {
      throw new Error("Wrong email or password. Demo accounts are saved separately in each browser.");
    }
    saveUser(record);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
