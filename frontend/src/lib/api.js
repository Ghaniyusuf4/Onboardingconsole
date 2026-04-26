import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "sg_session_token";

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout when session is rejected by the server
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      setToken(null);
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export async function fetchMe() {
  const r = await api.get("/auth/me");
  return r.data;
}

export async function logout() {
  setToken(null);
  await api.post("/auth/logout");
}

export async function exchangeSession(sessionId) {
  const r = await api.post("/auth/session", { session_id: sessionId }, { headers: { "X-Session-ID": sessionId } });
  return r.data;
}
