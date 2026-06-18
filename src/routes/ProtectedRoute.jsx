import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Memuat...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check role if allowedRoles is specified
  if (allowedRoles && user) {
    // Ambil role dari user object (sudah digabung di AuthContext)
    const userRole = user?.role;
    
    console.log("ProtectedRoute Check:");
    console.log("- User:", user?.email);
    console.log("- User role:", userRole);
    console.log("- Allowed roles:", allowedRoles);
    console.log("- Role in allowed?", userRole && allowedRoles.includes(userRole));
    
    // Jika role tidak ada atau tidak ada di allowedRoles
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.log("❌ Access denied - Role mismatch");
      return <Navigate to="/unauthorized" replace />;
    }
    
    console.log("✅ Access granted");
  }

  return children;
}

export default ProtectedRoute;