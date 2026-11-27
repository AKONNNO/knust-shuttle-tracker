import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/lib/types";
import { roleHome } from "@/lib/roles";
import { LoaderCircle } from "lucide-react";

interface ProtectedRouteProps {
  /** Roles allowed to view this route. Leave undefined for any signed-in user. */
  roles?: Role[];
  children: React.ReactNode;
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center">
        <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">Loading your campus transit…</p>
    </div>
  );
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { session, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && role && !roles.includes(role)) {
    return <Navigate to={roleHome(role)} replace />;
  }

  // Session exists but the profile hasn't loaded a role yet; wait a beat.
  if (roles && !role) return <FullScreenLoader />;

  return <>{children}</>;
}
