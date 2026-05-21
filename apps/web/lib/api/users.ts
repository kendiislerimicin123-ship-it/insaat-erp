import { apiClient } from './client';

export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION';

export interface Role {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isSystem?: boolean;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: UserStatus;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Role[];
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  thisMonthCreated: number;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status?: UserStatus;
  roleSlugs: string[];
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: UserStatus;
}

export interface UpdateUserRolesInput {
  roleSlugs: string[];
}

export interface ChangePasswordInput {
  newPassword: string;
}

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  status?: UserStatus;
  search?: string;
  role?: string;
}

export interface UsersListResponse {
  items: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const usersApi = {
  async list(query: ListUsersQuery = {}): Promise<UsersListResponse> {
    const { data } = await apiClient.get<UsersListResponse>('/users', {
      params: query,
    });
    return data;
  },

  async getById(id: string): Promise<User> {
    const { data } = await apiClient.get<User>(`/users/${id}`);
    return data;
  },

  async create(input: CreateUserInput): Promise<User> {
    const { data } = await apiClient.post<User>('/users', input);
    return data;
  },

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const { data } = await apiClient.patch<User>(`/users/${id}`, input);
    return data;
  },

  async updateRoles(id: string, input: UpdateUserRolesInput): Promise<User> {
    const { data } = await apiClient.patch<User>(`/users/${id}/roles`, input);
    return data;
  },

  async changePassword(
    id: string,
    input: ChangePasswordInput,
  ): Promise<{ message: string }> {
    const { data } = await apiClient.patch<{ message: string }>(
      `/users/${id}/password`,
      input,
    );
    return data;
  },

  async remove(id: string): Promise<{ message: string; id: string }> {
    const { data } = await apiClient.delete<{ message: string; id: string }>(
      `/users/${id}`,
    );
    return data;
  },

  async getStats(): Promise<UserStats> {
    const { data } = await apiClient.get<UserStats>('/users/stats');
    return data;
  },

  async getAvailableRoles(): Promise<Role[]> {
    const { data } = await apiClient.get<Role[]>('/users/roles');
    return data;
  },
};

// ─── Helper'lar ───
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Pasif',
  SUSPENDED: 'Askıda',
  PENDING_VERIFICATION: 'Onay Bekliyor',
};

export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-700',
};