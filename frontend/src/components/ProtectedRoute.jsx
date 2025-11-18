import React from "react";
import {Navigate} from "react-router-dom";
import {useAuth} from "../contexts/AuthContext";
import {Loader2} from "lucide-react";

export const ProtectedRoute = ({children}) => {
    const {isAuthenticated, loading} = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-sky-500 mx-auto mb-4" />
                    <p className="text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
