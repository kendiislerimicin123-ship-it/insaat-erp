import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/lib/api/auth';
import { tokenStorage } from '@/lib/api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      logout: () => {
        tokenStorage.clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      hasPermission: (permission: string) => {
        const user = get().user;
        return user?.permissions?.includes(permission) ?? false;
      },

      hasRole: (role: string) => {
        const user = get().user;
        return user?.roles?.includes(role) ?? false;
      },
    }),
    {
      name: 'insaat-erp-auth',
      partialize: (state) => ({ user: state.user }), // sadece user'ı sakla
    },
  ),
);