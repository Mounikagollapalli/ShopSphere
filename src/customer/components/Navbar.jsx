import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const links = [
  ["/", "Home", true],
  ["/shop", "Shop"],
  ["/admin", "Admin"],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { cartCount, wishCount } = useCart();
  const navigate = useNavigate();

  const cls = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm ${isActive ? "bg-indigo-600 text-white" : "hover:bg-slate-800"}`;

  const close = () => setOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate("/");
  };

  const badge = (count) =>
    count > 0 && (
      <span className="ml-1 rounded-full bg-indigo-500 px-1.5 py-0.5 text-xs">
        {count}
      </span>
    );

  const accountLinks = (
    <>
      <NavLink to="/wishlist" className={cls} onClick={close}>
        ♡ Wishlist{badge(wishCount)}
      </NavLink>
      <NavLink to="/cart" className={cls} onClick={close}>
        🛒 Cart{badge(cartCount)}
      </NavLink>

      {user ? (
        <>
          <NavLink to="/orders" className={cls} onClick={close}>My Orders</NavLink>
          <NavLink to="/spending" className={cls} onClick={close}>Spending</NavLink>
          <span className="px-3 py-2 text-sm text-slate-300">Hi, {user.name.split(" ")[0]}</span>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-800"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={cls} onClick={close}>Login</NavLink>
          <NavLink to="/signup" className={cls} onClick={close}>Sign up</NavLink>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold">
          Shop <span className="text-indigo-400">Sphere</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={cls}>{label}</NavLink>
          ))}
          <span className="mx-2 h-5 w-px bg-slate-700" />
          {accountLinks}
        </nav>

        <button
          className="text-2xl lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 px-4 pb-3 lg:hidden">
          {links.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={cls} onClick={close}>
              {label}
            </NavLink>
          ))}
          <div className="my-1 h-px bg-slate-700" />
          {accountLinks}
        </nav>
      )}
    </header>
  );
}