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

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
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

  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('agroerp:unauthorized'));
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
