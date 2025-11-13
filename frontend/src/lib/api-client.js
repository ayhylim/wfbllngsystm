const getEndpoint = path => {
    const baseUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

    // WhatsApp endpoints -> port 8002 (remove /whatsapp prefix)
    if (path.startsWith("/whatsapp/")) {
        const cleanPath = path.replace("/whatsapp", "");
        console.log(`🔵 WhatsApp Route: ${path} → http://localhost:8002${cleanPath}`);
        return `http://localhost:8002${cleanPath}`;
    }

    // Direct WhatsApp routes (backward compatibility)
    if (
        path.startsWith("/status") ||
        path.startsWith("/qr") ||
        path.startsWith("/reconnect") ||
        path.startsWith("/logout")
    ) {
        console.log(`🔵 WhatsApp Direct Route: http://localhost:8002${path}`);
        return `http://localhost:8002${path}`;
    }

    // Regular API endpoints -> port 8001 with /api prefix
    const endpoint = `${baseUrl}/api${path}`;
    console.log(`🟢 API Route: ${path} → ${endpoint}`);
    return endpoint;
};

export const apiCall = async (path, options = {}) => {
    try {
        const endpoint = getEndpoint(path);
        const response = await fetch(endpoint, {
            headers: {"Content-Type": "application/json", ...options.headers},
            ...options
        });

        if (!response.ok) {
            console.error(`❌ API Error [${path}]: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ API Call Failed [${path}]:`, error.message);
        throw error;
    }
};
