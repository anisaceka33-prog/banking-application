import api from "../lib/axios"
import type { LoginResponse, User } from "../types"

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>("/auth/login/", { email, password })
    const { access, refresh, user } = response.data

    localStorage.setItem("access_token", access)
    localStorage.setItem("refresh_token", refresh)

    return response.data
  },

  async logout(): Promise<void> {
    const refresh = localStorage.getItem("refresh_token")
    try {
      await api.post("/auth/logout/", { refresh })
    } finally {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>("/auth/me/")
    return response.data
  },
}
