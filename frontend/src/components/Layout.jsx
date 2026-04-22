import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { logout } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignOut, BookOpen } from "@phosphor-icons/react";
import SingularLogo from "@/components/SingularLogo";

export default function Layout() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--sg-bg)]" data-testid="layout">
      <nav className="panel topnav max-w-[1500px] mx-auto mt-4 mx-3 lg:mx-auto" data-testid="topnav">
        <NavLink to="/dashboard" className="brand-lockup">
          <SingularLogo height={30} />
          <span>Singular</span>
          <span className="brand-service-inline">Onboarding & Testing Console</span>
        </NavLink>
        <div className="flex items-center gap-1">
          <NavLink to="/dashboard" data-testid="nav-dashboard" className={({isActive}) => `topnav-link ${isActive ? "active" : ""}`}>
            Projects
          </NavLink>
          <NavLink to="/integrations" data-testid="nav-integrations" className={({isActive}) => `topnav-link ${isActive ? "active" : ""}`}>
            Integrations
          </NavLink>
          <a href="https://support.singular.net/hc/en-us/categories/360002441132" target="_blank" rel="noreferrer" className="topnav-link inline-flex items-center gap-1.5">
            <BookOpen weight="bold" className="w-3.5 h-3.5" /> SDK Docs
          </a>
          <div className="ml-3 pl-3 border-l border-[var(--sg-border)] flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.picture} />
              <AvatarFallback className="text-xs">{user?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <div className="text-xs font-semibold text-[var(--sg-fg)] leading-tight" data-testid="topnav-user-name">{user?.name}</div>
              <div className="text-[11px] text-[var(--sg-fg-3)]">{user?.email}</div>
            </div>
            <button data-testid="logout-button" onClick={handleLogout} className="topnav-link inline-flex items-center gap-1.5">
              <SignOut weight="bold" className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-[1500px] mx-auto px-3 lg:px-0">
        <Outlet />
      </main>
      <footer className="max-w-[1500px] mx-auto px-3 lg:px-0 py-6 text-xs text-[var(--sg-fg-3)] flex justify-between">
        <span>© 2026 · Singular Onboarding Console</span>
        <span>Powered by Singular Testing Console + Attribution Details APIs</span>
      </footer>
    </div>
  );
}
