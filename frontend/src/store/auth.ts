/**
 * Zustand auth store — manages authentication state across the app.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthTokens } from "@/types";

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;

  // Actions
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      login: (user, tokens) => {
        // Also persist to localStorage for the Axios interceptor
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", tokens.access);
          localStorage.setItem("refresh_token", tokens.refresh);
        }
        set({ user, tokens, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
        set({ user: null, tokens: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "hsm-auth",
      // Only persist user and isAuthenticated, not tokens (stored separately)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
