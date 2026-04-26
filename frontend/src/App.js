import { useEffect, useState, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { fetchMe, exchangeSession, setToken } from "@/lib/api";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ProjectDetail from "@/pages/ProjectDetail";
import PublicShare from "@/pages/PublicShare";
import Integrations from "@/pages/Integrations";
import Layout from "@/components/Layout";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try { setUser(await fetchMe()); } catch { setUser(null); }
    setLoading(false);
  };

  useEffect(() => {
    // CRITICAL: Skip /me check while OAuth callback is in URL
    const hash = window.location.hash || "";
    if (hash.includes("session_id=") || hash.includes("session_token=")) {
      setLoading(false);
      return;
    }
    refresh();
  }, []);

  return <AuthCtx.Provider value={{ user, loading, refresh, setUser }}>{children}</AuthCtx.Provider>;
}

function AuthCallback() {
  const navigate = useNavigate();
  const { setUser, refresh } = useAuth();
  useEffect(() => {
    const hash = window.location.hash || "";

    // New flow: session_token from our own OAuth callback
    const tokenMatch = hash.match(/session_token=([^&]+)/);
    if (tokenMatch) {
      setToken(decodeURIComponent(tokenMatch[1]));
      window.history.replaceState({}, "", "/dashboard");
      refresh().then(() => navigate("/dashboard", { replace: true }));
      return;
    }

    // Legacy Emergent flow: session_id exchange
    const sidMatch = hash.match(/session_id=([^&]+)/);
    if (!sidMatch) { navigate("/login"); return; }
    (async () => {
      try {
        const u = await exchangeSession(sidMatch[1]);
        setUser(u);
        window.history.replaceState({}, "", "/dashboard");
        navigate("/dashboard", { replace: true });
      } catch {
        navigate("/login");
      }
    })();
  }, []); // eslint-disable-line
  return <div className="min-h-screen flex items-center justify-center text-zinc-500">Signing you in…</div>;
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // CRITICAL: Detect session_id during render (prevents race conditions)
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes("session_id=") || location.hash?.includes("session_token=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/share/:token" element={<PublicShare />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/integrations" element={<Integrations />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </div>
  );
}
