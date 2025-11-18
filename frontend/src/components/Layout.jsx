// frontend/src/components/Layout.jsx - RESPONSIVE FIXED
import React, {useState} from "react";
import {Outlet, Link, useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "../contexts/AuthContext";
import {Home, Users, FileText, MessageSquare, Layout as LayoutIcon, Menu, LogOut, X} from "lucide-react";
import {Button} from "./ui/button";
import {Sheet, SheetContent, SheetTrigger} from "./ui/sheet";
import {toast} from "sonner";

const navigation = [
    {name: "Dashboard", href: "/", icon: Home},
    {name: "Pelanggan", href: "/customers", icon: Users},
    {name: "Template", href: "/templates", icon: LayoutIcon},
    {name: "Invoice", href: "/invoices", icon: FileText},
    {name: "WhatsApp", href: "/whatsapp", icon: MessageSquare}
];

export const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const {user, logout} = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        toast.success("Logout berhasil");
        navigate("/login");
    };

    const NavContent = () => (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                    WiFi Billing
                </h2>
                <p className="text-sm text-sky-600 mt-1">Sistem Tagihan & Invoice</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navigation.map(item => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            data-testid={`nav-${item.name.toLowerCase()}`}
                            onClick={() => setMobileOpen(false)}
                            className={`
                                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                                ${
                                    isActive
                                        ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-200"
                                        : "text-slate-700 hover:bg-white/80 hover:shadow-md"
                                }
                            `}
                        >
                            <Icon size={20} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 space-y-3 w-72">
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
                    {user?.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="w-10 h-10 rounded-full border-2 border-sky-300 flex-shrink-0" // ✅ DITAMBAHKAN: flex-shrink-0
                        />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {user?.name?.[0] || "A"}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || "Admin"}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                </div>

                {/* Logout Button */}
                <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                    <LogOut size={16} />
                    Logout
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-sky-50 via-blue-50 to-slate-50">
            {/* ⭐ FIXED: Desktop Sidebar - NO position:fixed, use flex instead */}
            <aside className="hidden lg:flex lg:w-72 bg-white/70 backdrop-blur-xl border-r border-sky-200 shadow-xl flex-shrink-0">
                <NavContent />
            </aside>

            {/* ⭐ FIXED: Mobile Menu - Sheet with proper overlay */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
                    <Button variant="outline" size="icon" className="bg-white shadow-lg">
                        <Menu size={20} />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 bg-white/95 backdrop-blur-xl">
                    <NavContent />
                </SheetContent>
            </Sheet>

            {/* ⭐ FIXED: Main Content - Proper flex layout with overflow */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header Spacer - untuk mobile menu button */}
                <div className="lg:hidden h-16 flex-shrink-0" />

                {/* Content Area with scroll */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
