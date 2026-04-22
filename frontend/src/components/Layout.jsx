import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { logout } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { House, FolderSimple, SignOut } from "@phosphor-icons/react";

export default function Layout() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col" data-testid="sidebar">
        <div className="p-5 border-b border-zinc-200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#0055FF] grid place-items-center text-white font-display font-black">S</div>
          <div>
            <div className="font-display font-bold text-zinc-900 leading-tight">Singular</div>
            <div className="text-[11px] text-zinc-500">Onboarding · Testing</div>
          </div>
        </div>
        <nav className="p-3 flex-1">
          <p className="eyebrow px-3 pb-2 pt-1">Workspace</p>
          <NavLink to="/dashboard" data-testid="nav-dashboard" className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${isActive ? "bg-zinc-100 text-zinc-950" : "text-zinc-600 hover:bg-zinc-50"}`}>
            <House weight="bold" className="w-4 h-4" /> Projects
          </NavLink>
        </nav>
        <div className="p-3 border-t border-zinc-200">
          <div className="flex items-center gap-3 p-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.picture} />
              <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-900 truncate" data-testid="sidebar-user-name">{user?.name}</div>
              <div className="text-xs text-zinc-500 truncate">{user?.email}</div>
            </div>
            <Button data-testid="logout-button" variant="ghost" size="icon" onClick={handleLogout} className="text-zinc-500 hover:text-zinc-900">
              <SignOut weight="bold" className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
