import { Navigate } from "react-router-dom";
import { isAdminAuthenticated } from "@/pages/AdminLogin";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
}
