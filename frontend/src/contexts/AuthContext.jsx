import React, {createContext, useContext, useState, useEffect} from "react";
import axios from "axios";

const AuthContext = createContext(null);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem("auth_token"));

    // Setup axios interceptor for auth token
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            verifyToken();
        } else {
            setLoading(false);
        }
    }, [token]);

    // Verify token on mount
    const verifyToken = async () => {
        try {
            const response = await axios.get(`${API}/auth/verify`);
            setUser(response.data.user);
        } catch (error) {
            console.error("Token verification failed:", error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    // Google Login
    const loginWithGoogle = async credential => {
        try {
            const response = await axios.post(`${API}/auth/google`, {credential});

            const {token: newToken, user: userData} = response.data;

            localStorage.setItem("auth_token", newToken);
            setToken(newToken);
            setUser(userData);

            axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

            return {success: true};
        } catch (error) {
            console.error("Google login failed:", error);
            return {
                success: false,
                error: error.response?.data?.error || "Login failed"
            };
        }
    };

    // Logout
    const logout = () => {
        localStorage.removeItem("auth_token");
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common["Authorization"];
    };

    const value = {
        user,
        loading,
        loginWithGoogle,
        logout,
        isAuthenticated: !!user
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};
