import { Link, Outlet, useLocation } from "react-router-dom";

export default function AppShell() {
  const location = useLocation();

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
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
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
