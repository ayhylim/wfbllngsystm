import React from "react";
import {BrowserRouter, Routes, Route} from "react-router-dom";
import {Toaster} from "./components/ui/sonner";
import {AuthProvider} from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Templates from "./pages/Templates";
import Invoices from "./pages/Invoices";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import "./App.css";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        {/* Public Route */}
                        <Route path="/login" element={<Login />} />

                        {/* Protected Routes */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Dashboard />} />
                            <Route path="customers" element={<Customers />} />
                            <Route path="templates" element={<Templates />} />
                            <Route path="invoices" element={<Invoices />} />
                            <Route path="whatsapp" element={<WhatsAppSettings />} />
                        </Route>
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
            <Toaster />
        </div>
    );
}

export default App;
