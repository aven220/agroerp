const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  return localStorage.getItem('agroerp_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('agroerp_token', token);
  else {
    localStorage.removeItem('agroerp_token');
    localStorage.removeItem('agroerp_refresh');
  }
}

type ApiRequestOptions = RequestInit & {
  /** Evita reintentar refresh en bucle. */
  skipAuthRefresh?: boolean;
};

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('agroerp_refresh');
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          accessToken?: string;
          refreshToken?: string;
        };
        if (!data.accessToken) return null;
        setToken(data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('agroerp_refresh', data.refreshToken);
        }
        return data.accessToken;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

function clearSessionAndNotify() {
  setToken(null);
  window.dispatchEvent(new Event('agroerp:unauthorized'));
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { skipAuthRefresh, ...fetchOptions } = options;
  const token = getToken();
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (fetchOptions.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
  } catch (err) {
    // Safari/iOS: TypeError "Load failed" when API/proxy/DB is unreachable
    const raw = err instanceof Error ? err.message : String(err);
    const network =
      /load failed|failed to fetch|networkerror|network request failed/i.test(raw) ||
      err instanceof TypeError;
    throw new ApiError(
      network
        ? 'No se pudo conectar con el servidor. Verifique que esté en la misma Wi‑Fi y que AgroERP esté encendido.'
        : raw || 'Error de red',
      0,
    );
  }

  const isAuthHandshake =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/refresh');

  if (res.status === 401 && !isAuthHandshake) {
    if (!skipAuthRefresh) {
      const nextToken = await refreshAccessToken();
      if (nextToken) {
        return apiRequest<T>(path, { ...options, skipAuthRefresh: true });
      }
    }
    clearSessionAndNotify();
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data as { message?: string | string[] })?.message ??
      `Error ${res.status}`;
    const message = Array.isArray(msg) ? msg.join(', ') : String(msg);
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}
