import { v4 as uuidv4 } from "uuid"

export function generateIdempotencyKey(): string {
  return uuidv4()
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-800"
    case "PENDING":
      return "bg-yellow-100 text-yellow-800"
    case "REJECTED":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function maskIban(iban: string): string {
  if (iban.length <= 8) return iban
  return `${iban.slice(0, 4)}****${iban.slice(-4)}`
}
