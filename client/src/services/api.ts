import axios from "axios";

// If deployed on Vercel, relative '/api' uses the Vercel rewrite proxy to Render!
// If VITE_API_URL is provided, it can also point directly to Render.
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for sending httpOnly cookies
});

// Attach Authorization header if access token exists in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag and queue to handle concurrent 401 requests
let isRefreshing = false;
let failedQueue: {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}[] = [];

const processQueue = (error: any) => {
  for (const promise of failedQueue) {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  }
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Automatically capture tokens if returned in response body
    if (response.data?.data?.accessToken) {
      localStorage.setItem('access_token', response.data.data.accessToken);
    }
    if (response.data?.data?.refreshToken) {
      localStorage.setItem('refresh_token', response.data.data.refreshToken);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      const isAuthUrl =
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/register") ||
        originalRequest.url?.includes("/auth/refresh");

      if (isAuthUrl) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            const token = localStorage.getItem('access_token');
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = localStorage.getItem('refresh_token');
        const refreshRes = await api.post("/auth/refresh", {
          refreshToken: storedRefreshToken || undefined,
        });

        const newAccessToken = refreshRes.data?.data?.accessToken;
        if (newAccessToken) {
          localStorage.setItem('access_token', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        if (refreshRes.data?.data?.refreshToken) {
          localStorage.setItem('refresh_token', refreshRes.data.data.refreshToken);
        }

        isRefreshing = false;
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Dispatch global logout event to let AuthContext know
        window.dispatchEvent(new Event("auth-logout"));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
