import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Frontend gating only ever hides the menu item — the real enforcement is
 * `requireAdmin` on the backend (Prompt 21: "Do not rely on hiding UI
 * buttons"). This guard exists so a non-admin doesn't land on a page full
 * of forms that will all 403, not because the UI is the security boundary.
 */
export function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();


  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
