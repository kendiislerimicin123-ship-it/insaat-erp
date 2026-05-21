import { apiClient } from './client';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  permissions: string[];
}

export interface LoginInput {
  companySlug: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authApi = {
  async login(input: LoginInput): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', input);
    return data;
  },

  async logout(refreshToken?: string): Promise<void> {
    await apiClient.post('/auth/logout', refreshToken ? { refreshToken } : {});
  },

  async getMe(): Promise<{ user: User }> {
    const { data } = await apiClient.get<{ user: User }>('/auth/me');
    return data;
  },
};