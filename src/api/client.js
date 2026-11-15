/**
 * HTTP client for the Gada customer API.
 *
 * VITE_API_URL must point at the versioned base, e.g.
 *   VITE_API_URL=https://your-domain.com/api/v1
 *
 * The backend wraps every response as { success, message, data }. This client
 * returns that envelope unchanged; callers read `.data`. Failures throw an
 * ApiError with a human-readable message (validation objects are flattened).
 */

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const TOKEN_KEY = 'gada_auth_token';
export const UNAUTHORIZED_EVENT = 'gada:unauthorized';

export class ApiError extends Error {
  constructor(message, { status = 0, errors = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

function messageFrom(payload, status) {
  const raw = payload?.message;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object') {
    // Laravel validator errors: { field: ["msg", ...] }
    const first = Object.values(raw).flat().find((v) => typeof v === 'string');
    if (first) return first;
  }
  if (status === 0) return 'Network error. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}

export const apiClient = {
  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable (private mode) – session lives in memory only */
    }
  },

  /**
   * @param {string} path      e.g. '/auth/login' (relative to VITE_API_URL)
   * @param {object} opts
   * @param {boolean} opts.auth     attach the stored Bearer token (default true)
   * @param {object}  opts.headers  caller headers; an explicit Authorization wins
   */
  async request(path, { method = 'GET', body, query, headers = {}, auth = true } = {}) {
    const qs = query
      ? new URLSearchParams(
          Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
        ).toString()
      : '';
    const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;

    const finalHeaders = { Accept: 'application/json', ...headers };
    if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';

    const token = this.getToken();
    if (auth && token && !finalHeaders.Authorization) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(messageFrom(null, 0), { status: 0 });
    }

    const text = await res.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!res.ok || payload?.success === false) {
      // A stored session the server no longer accepts: let AuthContext clear it.
      if (res.status === 401 && auth && token) {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
      throw new ApiError(messageFrom(payload, res.status), {
        status: res.status,
        errors: payload?.message ?? null,
      });
    }

    return payload ?? {};
  },

  get(path, query, opts) {
    return this.request(path, { ...opts, method: 'GET', query });
  },
  post(path, body, opts) {
    return this.request(path, { ...opts, method: 'POST', body });
  },
};
