import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://voltrix-api-production.up.railway.app/v1";

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000, // 15 second timeout — prevents hanging requests
});

// ── Request interceptor — attach access token ──────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("voltrix_access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Track if we're already refreshing to prevent loops ────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

// ── Response interceptor — auto refresh on 401 ────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Network error — show friendly message
    if (!error.response) {
      return Promise.reject(new Error("Network error. Check your connection and try again."));
    }

    // 401 — try to refresh token silently
    if (error.response.status === 401 && !original._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== "undefined"
        ? localStorage.getItem("voltrix_refresh_token")
        : null;

      if (!refreshToken || refreshToken === "cognito_managed") {
        // No refresh token — clear session and redirect
        clearSession();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const { access_token } = res.data.data;

        if (typeof window !== "undefined") {
          localStorage.setItem("voltrix_access_token", access_token);
        }

        processQueue(null, access_token);
        original.headers = { ...original.headers, Authorization: `Bearer ${access_token}` };
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("voltrix_access_token");
    localStorage.removeItem("voltrix_refresh_token");
    localStorage.removeItem("voltrix_user");
    // Only redirect if not already on auth pages
    const path = window.location.pathname;
    if (!path.startsWith("/login") && !path.startsWith("/signup")) {
      window.location.href = "/login";
    }
  }
}

export { clearSession };
export default api;
