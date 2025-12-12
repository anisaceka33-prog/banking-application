import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User, UserRole } from "../types"

interface AuthState {
  user: Pick<User, "id" | "email" | "role" | "first_name" | "last_name"> | null
  isAuthenticated: boolean
  setUser: (user: AuthState["user"]) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)

export const hasRole = (requiredRoles: UserRole[]): boolean => {
  const user = useAuthStore.getState().user
  return user ? requiredRoles.includes(user.role) : false
}
