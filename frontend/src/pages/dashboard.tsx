"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "../store/auth-store"
import { bankingService } from "../services/banking-service"
import { userService } from "../services/user-service"
import { MainLayout } from "../components/layout/main-layout"
import { Card, CardContent, CardHeader } from "../components/ui/card"
import { formatCurrency } from "../utils/helpers"
import type { BankAccount, Transaction } from "../types"

export function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    accounts: 0,
    cards: 0,
    pendingApplications: 0,
    totalBalance: 0,
    recentTransactions: [] as Transaction[],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (user?.role === "CLIENT") {
          const [accountsRes, cardsRes, transactionsRes] = await Promise.all([
            bankingService.getAccounts(),
            bankingService.getCards(),
            bankingService.getTransactions({ page: 1 }),
          ])

          const totalBalance = accountsRes.results
            .filter((a: BankAccount) => a.status === "APPROVED")
            .reduce((sum: number, a: BankAccount) => sum + a.balance, 0)

          setStats({
            accounts: accountsRes.count,
            cards: cardsRes.count,
            pendingApplications: 0,
            totalBalance,
            recentTransactions: transactionsRes.results.slice(0, 5),
          })
        } else if (user?.role === "BANKER") {
          const [pendingAccounts, pendingCards, transactionsRes] = await Promise.all([
            bankingService.getPendingAccounts(),
            bankingService.getPendingCards(),
            bankingService.getTransactions({ page: 1 }),
          ])

          setStats({
            accounts: 0,
            cards: 0,
            pendingApplications: pendingAccounts.count + pendingCards.count,
            totalBalance: 0,
            recentTransactions: transactionsRes.results.slice(0, 5),
          })
        } else if (user?.role === "ADMIN") {
          const bankersRes = await userService.getBankers()
          setStats({
            accounts: 0,
            cards: 0,
            pendingApplications: 0,
            totalBalance: bankersRes.count,
            recentTransactions: [],
          })
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.first_name}!</h1>
          <p className="text-gray-500">Bank Activity</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-6">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {user?.role === "CLIENT" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Bank Accounts</p>
                        <p className="text-2xl font-bold">{stats.accounts}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Cards</p>
                        <p className="text-2xl font-bold">{stats.cards}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {user?.role === "BANKER" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pending Applications</p>
                        <p className="text-2xl font-bold">{stats.pendingApplications}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {user?.role === "ADMIN" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-100 rounded-lg">
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Bankers</p>
                        <p className="text-2xl font-bold">{stats.totalBalance}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
