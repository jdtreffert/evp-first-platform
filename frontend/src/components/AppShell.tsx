import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useState } from "react";

export default function AppShell() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await logout();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Unable to sign out");
    }
  };

  const navItems = [
    { label: "Home", path: "/" },
    { label: "My Journey", path: "/journey" },
    { label: "Community", path: "/community" },
    { label: "Resources", path: "/resources" },
    { label: "Archive", path: "/archive" },
    { label: "Account", path: "/account" }
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-6 space-y-4 hidden md:block">
        <h1 className="text-2xl font-bold mb-6">EVP First</h1>

        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-3 py-2 rounded 
              ${location.pathname === item.path ? "bg-gray-700" : "hover:bg-gray-700"}`}
          >
            {item.label}
          </Link>
        ))}
        <div className="absolute bottom-6 left-6 right-6 w-52 border-t border-gray-700 pt-4">
          <p className="truncate text-sm text-gray-300">{user?.email}</p>
          <p className="mt-1 text-xs capitalize text-gray-400">{user?.role}</p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-3 text-sm text-cyan-300 hover:text-cyan-200"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between md:hidden">
          <span className="max-w-[65%] truncate text-sm text-gray-300">{user?.email}</span>
          <button type="button" onClick={() => void handleLogout()} className="text-sm text-cyan-300">
            Sign out
          </button>
        </div>
        {logoutError && <p role="alert" className="mb-3 text-sm text-rose-300">{logoutError}</p>}
        <Outlet />
      </main>

      {/* Mobile Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 p-2 flex justify-around md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-3 py-2 rounded text-sm 
              ${location.pathname === item.path ? "bg-gray-700" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
