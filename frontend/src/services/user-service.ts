import api from "../lib/axios"
import type { User, CreateBankerPayload, CreateClientPayload, PaginatedResponse } from "../types"

export const userService = {
  // Banker Management 
  async getBankers(page = 1): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams()
    if (page) params.append("page", String(page))

    const response = await api.get<PaginatedResponse<User>>(`/users/bankers/?${params}`)
    return response.data
  },

  async getBanker(id: number): Promise<User> {
    const response = await api.get<User>(`/users/bankers/${id}/`)
    return response.data
  },

  async createBanker(data: CreateBankerPayload): Promise<User> {
    const response = await api.post<User>("/users/bankers/", data)
    return response.data
  },

  async updateBanker(id: number, data: Partial<User>): Promise<User> {
    const response = await api.patch<User>(`/users/bankers/${id}/`, data)
    return response.data
  },

  async deleteBanker(id: number): Promise<void> {
    await api.delete(`/users/bankers/${id}/`)
  },

  // Client Management 
  async getClients(page = 1): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams()
    if (page) params.append("page", String(page))

    const response = await api.get<PaginatedResponse<User>>(`/users/clients/?${params}`)
    return response.data
  },

  async getClient(id: number): Promise<User> {
    const response = await api.get<User>(`/users/clients/${id}/`)
    return response.data
  },

  async createClient(data: CreateClientPayload): Promise<User> {
    const response = await api.post<User>("/users/clients/", data)
    return response.data
  },

  async updateClient(id: number, data: Partial<User>): Promise<User> {
    const response = await api.patch<User>(`/users/clients/${id}/`, data)
    return response.data
  },

  async deleteClient(id: number): Promise<void> {
    await api.delete(`/users/clients/${id}/`)
  },
}
