import { apiClient } from './client';

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  thisMonthCreated: number;
}

export const usersApi = {
  async getStats(): Promise<UserStats> {
    const { data } = await apiClient.get<UserStats>('/users/stats');
    return data;
  },
};