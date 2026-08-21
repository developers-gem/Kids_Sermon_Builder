import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-full px-3 py-1.5 hover:bg-secondary ${isActive ? "bg-secondary" : ""}`;
}

export function RootLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      <header className="no-print border-b-2 border-border bg-card/70 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="font-display text-lg font-extrabold">
            <span className="rounded-lg bg-primary px-2 py-1 text-primary-foreground">Kids</span>{" "}
            Sermon Builder
          </NavLink>
          <div className="ml-auto flex items-center gap-1 text-sm font-bold">
            <NavLink to="/" end className={navClass}>
              Builder
            </NavLink>
            <NavLink to="/create" className={navClass}>
              Custom story
            </NavLink>
            <NavLink to="/library" className={navClass}>
              Library
            </NavLink>
            {!loading && user && (
              <NavLink to="/my-lessons" className={navClass}>
                My lessons
              </NavLink>
            )}
            {!loading && user?.role === "admin" && (
              <NavLink to="/admin/stories" className={navClass}>
                Admin
              </NavLink>
            )}
            {!loading &&
              (user ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground hover:bg-secondary"
                  title={`Log out (${user.email})`}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log out
                </button>
              ) : (
                <NavLink to="/login" className={navClass}>
                  Log in
                </NavLink>
              ))}
          </div>
        </nav>
      </header>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </>
  );
}
