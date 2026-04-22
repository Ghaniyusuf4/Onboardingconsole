import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export async function fetchMe() {
  const r = await api.get("/auth/me");
  return r.data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function exchangeSession(sessionId) {
  const r = await api.post("/auth/session", { session_id: sessionId }, { headers: { "X-Session-ID": sessionId } });
  return r.data;
}
