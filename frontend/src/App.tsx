import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import { AuthProvider } from "./auth/AuthProvider";
import { useAuth } from "./auth/useAuth";

import Home from "./pages/Home";
import MyJourney from "./pages/MyJourney";
import Community from "./pages/Community";
import Resources from "./pages/Resources";
import Archive from "./pages/Archive";
import Account from "./pages/Account";
import Login from "./pages/Login";

function ProtectedApp() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">Checking your session…</main>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedApp />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/journey" element={<MyJourney />} />
          <Route path="/community" element={<Community />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/account" element={<Account />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
