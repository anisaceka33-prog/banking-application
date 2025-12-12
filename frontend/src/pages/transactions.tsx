"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useAuthStore } from "../store/auth-store"
import { bankingService } from "../services/banking-service"
import { MainLayout } from "../components/layout/main-layout"
import { Card, CardContent, CardHeader } from "../components/ui/card"
import { Select } from "../components/ui/select"
import { formatCurrency, formatDateTime } from "../utils/helpers"
import type { Transaction, BankAccount, PaginatedResponse } from "../types"

export function TransactionsPage() {
  const { user } = useAuthStore()
  const [transactions, setTransactions] = useState<PaginatedResponse<Transaction> | null>(null)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [filters, setFilters] = useState({ account_id: "", type: "" })
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [txData, accountsData] = await Promise.all([
        bankingService.getTransactions(filters),
        bankingService.getAccounts(),
      ])
      setTransactions(txData)
      setAccounts(accountsData.results)
    } catch (error) {
      toast.error("Failed to load transactions")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filters])

  return (
    <MainLayout allowedRoles={["CLIENT", "BANKER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
          </h1>
          <p className="text-gray-500">View transactions</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-4">
              <div className="w-64">
                <Select
                  label="Filter by Account"
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: a.iban,
                  }))}
                  value={filters.account_id}
                  onChange={(e) => setFilters((f) => ({ ...f, account_id: e.target.value }))}
                />
              </div>
              <div className="w-48">
                <Select
                  label="Filter by Type"
                  options={[
                    { value: "DEBIT", label: "Debit" },
                    { value: "CREDIT", label: "Credit" },
                  ]}
                  value={filters.type}
                  onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : transactions?.results.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions found</p>
            ) : (
              <div className="space-y-2">
                {transactions?.results.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-gray-500">
                          {tx.account_iban} {tx.reference_iban && `→ ${tx.reference_iban}`}
                        </p>
                        <p className="text-xs text-gray-400">{formatDateTime(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-semibold ${
                          tx.transaction_type === "CREDIT" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.transaction_type === "CREDIT" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </p>
                     
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
