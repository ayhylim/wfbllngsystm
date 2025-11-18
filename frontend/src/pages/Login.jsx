import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../contexts/AuthContext";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "../components/ui/card";
import {Button} from "../components/ui/button";
import {toast} from "sonner";
import {Wifi, LogIn, Loader2} from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export const Login = () => {
    const {loginWithGoogle, isAuthenticated} = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [googleLoaded, setGoogleLoaded] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, navigate]);

    // Initialize Google Sign-In - WITH BETTER LOADING
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;

        const initializeGoogle = () => {
            if (window.google) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: handleGoogleResponse
                    });

                    window.google.accounts.id.renderButton(document.getElementById("google-signin-button"), {
                        theme: "outline",
                        size: "large",
                        width: 300,
                        text: "signin_with",
                        shape: "rectangular"
                    });

                    setGoogleLoaded(true);
                    console.log("✅ Google Sign-In initialized");
                } catch (error) {
                    console.error("❌ Google initialization error:", error);
                }
            } else {
                // Retry after 100ms if Google script not loaded yet
                setTimeout(initializeGoogle, 100);
            }
        };

        initializeGoogle();
    }, [GOOGLE_CLIENT_ID]);

    const handleGoogleResponse = async response => {
        setLoading(true);
        try {
            const result = await loginWithGoogle(response.credential);

            if (result.success) {
                toast.success("Login berhasil! 🎉");
                navigate("/");
            } else {
                toast.error(result.error || "Login gagal");
            }
        } catch (error) {
            toast.error("Terjadi kesalahan saat login");
        } finally {
            setLoading(false);
        }
    };

    if (!GOOGLE_CLIENT_ID) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-rose-600">Configuration Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600">
                            Google Client ID belum dikonfigurasi. Tambahkan REACT_APP_GOOGLE_CLIENT_ID di .env file.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50 p-4">
            <Card className="w-full max-w-md shadow-2xl border-sky-200">
                <CardHeader className="space-y-4 text-center pb-8">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <Wifi className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                            WiFi Billing System
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                            Sistem Manajemen Invoice & Tagihan WiFi
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                        <p className="text-sm text-sky-800 text-center">
                            <strong>Silakan login dengan akun Google Anda</strong>
                            <br />
                            Data Anda akan tersimpan secara terpisah dan aman
                        </p>
                    </div>

                    {/* Google Sign-In Button */}
                    <div className="flex justify-center">
                        {loading ? (
                            <Button disabled className="w-full max-w-xs">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Logging in...
                            </Button>
                        ) : (
                            <div id="google-signin-button" className="flex justify-center"></div>
                        )}
                    </div>

                    <div className="border-t pt-6">
                        <div className="space-y-2 text-xs text-slate-600">
                            <p className="flex items-start gap-2">
                                <span className="text-green-600">✓</span>
                                <span>Setiap akun memiliki data terpisah</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="text-green-600">✓</span>
                                <span>Login aman dengan Google OAuth</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="text-green-600">✓</span>
                                <span>Data tersimpan di database pribadi</span>
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="absolute bottom-4 text-center text-sm text-slate-500">
                <p>WiFi Billing System v2.0</p>
                <p className="text-xs mt-1">Powered by Google OAuth & MongoDB</p>
            </div>
        </div>
    );
};

export default Login;
