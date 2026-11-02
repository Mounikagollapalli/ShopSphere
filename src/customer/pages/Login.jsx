import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Could not log in. Is JSON Server running?");
    }
    setBusy(false);
  };

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold">Login</h2>
      <p className="mb-5 mt-1 text-sm text-slate-500">Welcome back to ShopSphere.</p>

      <form onSubmit={submit} className="space-y-4">
        <input
          className={input}
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className={input}
          type="password"
          placeholder="Password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-600">
        New here?{" "}
        <Link to="/signup" className="font-medium text-indigo-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}