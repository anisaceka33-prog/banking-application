import api from "../lib/axios"
import type {
  BankAccount,
  Card,
  Transaction,
  CreateAccountPayload,
  CreateCardPayload,
  CreateTransactionPayload,
  ApprovalPayload,
  PaginatedResponse,
} from "../types"

export const bankingService = {
  async getAccounts(params?: { page?: number; status?: string; client_id?: number; search?: string }): Promise<PaginatedResponse<BankAccount>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append("page", String(params.page))
    if (params?.status) queryParams.append("status", params.status)
    if (params?.client_id) queryParams.append("client_id", String(params.client_id))
    if (params?.search) queryParams.append("search", params.search)

    const response = await api.get<PaginatedResponse<BankAccount>>(`/accounts/?${queryParams}`)
    return response.data
  },

  async getPendingAccounts(page = 1): Promise<PaginatedResponse<BankAccount>> {
    return this.getAccounts({ page, status: "PENDING" })
  },

  async getAccount(id: string): Promise<BankAccount> {
    const response = await api.get<BankAccount>(`/accounts/${id}/`)
    return response.data
  },

  async createAccount(data: CreateAccountPayload): Promise<BankAccount> {
    const response = await api.post<BankAccount>("/accounts/", data)
    return response.data
  },

  async updateAccountStatus(id: string, status: string, reason?: string): Promise<BankAccount> {
    const data: any = { status: status.toUpperCase() }
    if (reason) data.rejection_reason = reason

    const response = await api.patch<BankAccount>(`/accounts/${id}/`, data)
    return response.data
  },

  async processAccountApplication(id: string, data: ApprovalPayload): Promise<BankAccount> {
    const status = data.action === "approve" ? "APPROVED" : "REJECTED"
    return this.updateAccountStatus(id, status, data.reason)
  },

  async depositToAccount(id: string, amount: number, description?: string): Promise<BankAccount> {
    const data: any = { amount }
    if (description) data.description = description

    const response = await api.post<BankAccount>(`/accounts/${id}/deposit/`, data)
    return response.data
  },

  // Cards
  async getCards(params?: { page?: number; status?: string; account_id?: string }): Promise<PaginatedResponse<Card>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append("page", String(params.page))
    if (params?.status) queryParams.append("status", params.status)
    if (params?.account_id) queryParams.append("account_id", params.account_id)

    const response = await api.get<PaginatedResponse<Card>>(`/cards/?${queryParams}`)
    return response.data
  },

  async getPendingCards(page = 1): Promise<PaginatedResponse<Card>> {
    return this.getCards({ page, status: "PENDING" })
  },

  async getCard(id: string): Promise<Card> {
    const response = await api.get<Card>(`/cards/${id}/`)
    return response.data
  },

  async createCard(data: CreateCardPayload): Promise<Card> {
    const response = await api.post<Card>("/cards/", data)
    return response.data
  },

  async updateCardStatus(id: string, status: string, reason?: string): Promise<Card> {
    const data: any = { status: status.toUpperCase() }
    if (reason) data.rejection_reason = reason

    const response = await api.patch<Card>(`/cards/${id}/`, data)
    return response.data
  },

  async processCardApplication(id: string, data: ApprovalPayload): Promise<Card> {
    const status = data.action === "approve" ? "APPROVED" : "REJECTED"
    return this.updateCardStatus(id, status, data.reason)
  },

  // Transactions
  async getTransactions(params?: { page?: number; account_id?: string; type?: string }): Promise<
    PaginatedResponse<Transaction>
  > {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append("page", String(params.page))
    if (params?.account_id) queryParams.append("account_id", params.account_id)
    if (params?.type) queryParams.append("type", params.type)

    const response = await api.get<PaginatedResponse<Transaction>>(`/transactions/?${queryParams}`)
    return response.data
  },

  async createTransaction(data: CreateTransactionPayload): Promise<Transaction> {
    const response = await api.post<Transaction>("/transactions/", data)
    return response.data
  },
}
