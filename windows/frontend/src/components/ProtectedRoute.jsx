import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import Spinner from "./Spinner.jsx";

/**
 * Guards the authenticated pages. Without this, opening /dashboard while
 * signed out left the page stuck on an empty layout while every request
 * quietly returned 401.
 */
export default function ProtectedRoute({ requireHandle = true }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <Spinner label="Checking your session..." />;
    }

    if (!user) {
        return <Navigate to="/" replace state={{ from: location.pathname }} />;
    }

    if (requireHandle && !user.handle) {
        return <Navigate to="/setup" replace />;
    }

    return <Outlet context={{ user }} />;
}
