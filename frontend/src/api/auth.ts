import { apiRequest, setToken } from './client';
import type { AuthUser, UserProfile } from '../types';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  mfaRequired?: boolean;
  mustChangePassword?: boolean;
  mfaToken?: string;
}

export async function login(email: string, password: string) {
  const data = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!data.mfaRequired && data.accessToken) {
    setToken(data.accessToken);
    localStorage.setItem('agroerp_refresh', data.refreshToken);
  }
  return data;
}

export async function completeMfaLogin(mfaToken: string, code: string) {
  const data = await apiRequest<LoginResponse>('/auth/login/mfa', {
    method: 'POST',
    body: JSON.stringify({ mfaToken, code }),
  });
  setToken(data.accessToken);
  localStorage.setItem('agroerp_refresh', data.refreshToken);
  return data;
}

export async function logout() {
  const refreshToken = localStorage.getItem('agroerp_refresh');
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    /* ignore */
  }
  setToken(null);
  localStorage.removeItem('agroerp_refresh');
}

export async function getMe() {
  return apiRequest<UserProfile>('/auth/me');
}
