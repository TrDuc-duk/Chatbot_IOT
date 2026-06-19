import axios from "axios";

const instance = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
});

// Axios dùng riêng để gọi Refresh, tránh bị dính Interceptor của cái chính
const refreshInstance = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
});

/* ===== Request interceptor ===== */
instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/* ===== Response interceptor ===== */
instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi 401 và chưa retry lần nào
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const rfToken = localStorage.getItem("refreshToken");
                if (!rfToken) throw new Error("No RF Token");

                // Gửi request refresh
                // Lưu ý: NestJS của bạn nhận refreshToken qua tham số, 
                // hãy kiểm tra Controller của bạn nhận nó từ Body hay Header.
                // Giả sử Controller của bạn là: @Post('refresh') async refresh(@Body('refreshToken') token: string)
                const res = await refreshInstance.post("/api/auth/refresh", {
                    refreshToken: rfToken
                });

                // KIỂM TRA CHỖ NÀY:
                // Nếu NestJS trả về trực tiếp {accessToken, refreshToken}
                const data = res.data?.data ? res.data.data : res.data; 
                const { accessToken, refreshToken: newRefreshToken } = data;

                if (accessToken) {
                    localStorage.setItem("accessToken", accessToken);
                    if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);
                    
                    // Gắn token mới và thực hiện lại request cũ
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return instance(originalRequest);
                }
            } catch (err) {
                console.error("Refresh failed:", err);
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                window.location.href = "/login";
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);

export default instance;