export type UserRole = "ADMIN" | "BANKER" | "CLIENT"

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED"

export type TransactionType = "DEBIT" | "CREDIT"

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: UserRole
  phone_number?: string
  address?: string
  date_of_birth?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginResponse extends AuthTokens {
  user: Pick<User, "id" | "email" | "role" | "first_name" | "last_name">
}

export interface BankAccount {
  id: string
  client: number
  client_name: string
  client_email: string
  iban: string
  currency: string
  balance: number
  status: ApplicationStatus
  rejection_reason?: string
  has_linked_card: boolean
  approved_by?: number
  created_at: string
  updated_at: string
}

export interface Card {
  id: string
  client: number
  client_name: string
  client_email: string
  bank_account: string
  account_iban: string
  card_type: string
  card_number: string
  masked_number: string
  monthly_salary: number
  status: ApplicationStatus
  rejection_reason?: string
  expiry_date?: string
  approved_by?: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  bank_account: string
  account_iban: string
  transaction_type: TransactionType
  amount: number
  currency: string
  description: string
  reference_iban?: string
  balance_after: number
  created_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface CreateBankerPayload {
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
  phone_number?: string
  address?: string
  date_of_birth?: string
}

export interface CreateClientPayload extends CreateBankerPayload {}

export interface CreateAccountPayload {
  currency: string
}

export interface CreateCardPayload {
  bank_account: string
  monthly_salary: number
}

export interface CreateTransactionPayload {
  source_account: string
  target_iban: string
  amount: number
  description?: string
  idempotency_key: string
}

export interface ApprovalPayload {
  action: "approve" | "reject"
  reason?: string
}
