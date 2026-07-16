import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // Crucial for sending httpOnly cookies
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
  (response) => response,
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
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        isRefreshing = false;
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        // Dispatch global logout event to let AuthContext know
        window.dispatchEvent(new Event("auth-logout"));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
