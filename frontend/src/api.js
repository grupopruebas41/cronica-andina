/**
 * Cliente HTTP para la API PHP.
 * - Envía el token Bearer cuando hay sesión.
 * - Guarda en memoria las respuestas GET públicas durante 30 s (menos peticiones = menos datos y batería).
 * - Convierte los errores en objetos con mensaje claro y errores por campo.
 */
const BASE = '/api';
const TOKEN_KEY = 'ca_token';
const cache = new Map();
const CACHE_MS = 30_000;

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* almacenamiento no disponible */ }
}

export class ApiError extends Error {
  constructor(status, message, errors = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export async function request(path, { method = 'GET', body, cacheable = false, signal } = {}) {
  const key = path;
  if (method === 'GET' && cacheable) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.time < CACHE_MS) return hit.data;
  }
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = body instanceof FormData;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa tu internet e inténtalo otra vez.');
  }

  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || 'No se pudo completar la acción.', data?.errors || {});
  }
  if (method !== 'GET') cache.clear(); // cualquier cambio invalida la caché
  if (method === 'GET' && cacheable) cache.set(key, { time: Date.now(), data });
  return data;
}

export const api = {
  get: (p, o) => request(p, { ...o }),
  getCached: (p, o) => request(p, { ...o, cacheable: true }),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  clearCache: () => cache.clear(),
};
