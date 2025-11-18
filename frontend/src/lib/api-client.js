const getEndpoint = path => {
    const baseUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

    // WhatsApp endpoints -> proxy via backend port 8001
    if (path.startsWith("/whatsapp/")) {
        const endpoint = `${baseUrl}/api${path}`;
        console.log(`🔵 WhatsApp Route (Proxied): ${path} → ${endpoint}`);
        return endpoint;
    }

    // Regular API endpoints
    const endpoint = `${baseUrl}/api${path}`;
    console.log(`🟢 API Route: ${path} → ${endpoint}`);
    return endpoint;
};

export const apiCall = async (path, options = {}) => {
    try {
        const endpoint = getEndpoint(path);
        console.log(`🔵 API Call: ${path} → ${endpoint}`);

        const response = await fetch(endpoint, {
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error [${path}]:`, response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ API Call Failed [${path}]:`, error.message);
        throw error;
    }
};
