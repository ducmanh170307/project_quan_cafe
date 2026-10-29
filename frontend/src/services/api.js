const API_BASE_URL = 'http://localhost:5000/api';

const ApiClient = {
    async get(endpoint) {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`[API Fallback GET ${endpoint}]: Đang dùng dữ liệu Local State.`, err.message);
            return null;
        }
    },

    async post(endpoint, payload) {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await res.json();
        } catch (err) {
            console.warn(`[API Fallback POST ${endpoint}]: Đang xử lý trên Local State.`, err.message);
            return null;
        }
    }
};