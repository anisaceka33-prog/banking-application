"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { useAuthStore } from "../store/auth-store"
import { bankingService } from "../services/banking-service"
import { MainLayout } from "../components/layout/main-layout"
import { Card, CardContent, CardHeader } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Modal } from "../components/ui/modal"
import { Input } from "../components/ui/input"
import { formatCurrency, formatDate } from "../utils/helpers"
import type { BankAccount, PaginatedResponse } from "../types"

interface DepositForm {
  amount: number
  description?: string
}

export function AccountsPage() {
  const { user } = useAuthStore()
  const [accounts, setAccounts] = useState<PaginatedResponse<BankAccount> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)

  const { handleSubmit, reset } = useForm()
  const {
    register: registerDeposit,
    handleSubmit: handleDepositSubmit,
    formState: { errors: depositErrors },
    reset: resetDeposit,
  } = useForm<DepositForm>()

  const fetchAccounts = async (search?: string) => {
    try {
      setIsLoading(true)
      const data = await bankingService.getAccounts({ search })
      setAccounts(data)
    } catch (error) {
      toast.error("Failed to load accounts")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.role === "BANKER") {
        fetchAccounts(searchQuery || undefined)
      }
    }, 300) 

    return () => clearTimeout(timer)
  }, [searchQuery, user?.role])

  const onSubmit = async () => {
    setIsSubmitting(true)
    try {
      await bankingService.createAccount({ currency: "EUR" })
      toast.success("Account application submitted!")
      setIsModalOpen(false)
      reset()
      fetchAccounts()
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to submit application"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeposit = (account: BankAccount) => {
    setSelectedAccount(account)
    setIsDepositModalOpen(true)
  }

  const onDepositSubmit = async (data: DepositForm) => {
    if (!selectedAccount) return

    setIsSubmitting(true)
    try {
      await bankingService.depositToAccount(selectedAccount.id, data.amount, data.description)
      toast.success(`Successfully deposited ${formatCurrency(data.amount)} to account ${selectedAccount.iban}`)
      setIsDepositModalOpen(false)
      resetDeposit()
      fetchAccounts(searchQuery || undefined)
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to deposit"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "success"
      case "PENDING":
        return "warning"
      case "REJECTED":
        return "danger"
      default:
        return "default"
    }
  }

  return (
    <MainLayout allowedRoles={["CLIENT", "BANKER"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.role === "CLIENT" ? "My Bank Accounts" : "All Bank Accounts"}
            </h1>
            <p className="text-gray-500">
              {user?.role === "CLIENT" ? "View your accounts" : "View all accounts"}
            </p>
          </div>
          {user?.role === "CLIENT" && (
            <Button onClick={() => setIsModalOpen(true)}>
              New Account
            </Button>
          )}
        </div>

        {user?.role === "BANKER" && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search by email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-6">
                  <div className="h-32 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : accounts?.results.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No accounts found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts?.results.map((account) => (
              <Card key={account.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <h3 className="font-semibold"> Account</h3>
                  <Badge variant={getStatusBadgeVariant(account.status)}>{account.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">IBAN</p>
                    <p className="font-mono text-sm">{account.iban}</p>
                  </div>
                  {account.status === "APPROVED" && (
                    <div>
                      <p className="text-sm text-gray-500">Balance</p>
                      <p className="text-2xl font-bold">{formatCurrency(account.balance)}</p>
                    </div>
                  )}
                  {account.rejection_reason && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm text-red-600">
                        <strong>Rejection reason:</strong> {account.rejection_reason}
                      </p>
                    </div>
                  )}
                  {user?.role === "BANKER" && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-gray-500">Client</p>
                      <p className="text-sm font-medium">{account.client_name}</p>
                      <p className="text-xs text-gray-400">{account.client_email}</p>
                    </div>
                  )}
                  {user?.role === "BANKER" && account.status === "APPROVED" && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full"
                        onClick={() => handleDeposit(account)}
                      >
                        Add Balance
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Apply for Account">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700">
               Your application will be reviewed by a banker.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Submit Application
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isDepositModalOpen}
          onClose={() => {
            setIsDepositModalOpen(false)
            resetDeposit()
          }}
          title="Add Balance to Account"
        >
          <form onSubmit={handleDepositSubmit(onDepositSubmit)} className="space-y-4">
            {selectedAccount && (
              <div className="bg-beige-50 p-4 rounded-lg border border-beige-200">
                <p className="text-sm text-beige-700 font-medium">Account Details</p>
                <p className="text-xs text-beige-600 mt-1">
                  <strong>Client:</strong> {selectedAccount.client_name}
                </p>
                <p className="text-xs text-beige-600">
                  <strong>IBAN:</strong> {selectedAccount.iban}
                </p>
                <p className="text-xs text-beige-600">
                  <strong>Current Balance:</strong> {formatCurrency(selectedAccount.balance)}
                </p>
              </div>
            )}

            <Input
              label="Amount"
              type="number"
              id="amount"
              step="0.01"
              min="0.01"
              placeholder=""
              error={depositErrors.amount?.message}
              {...registerDeposit("amount", {
                required: "Amount is required",
                min: { value: 0.01, message: "Amount should be positive" },
                valueAsNumber: true,
              })}
            />

            <Input
              label="Description"
              type="text"
              id="description"
              placeholder="e.g., Initial deposit, Monthly salary"
              {...registerDeposit("description")}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsDepositModalOpen(false)
                  resetDeposit()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Add Balance
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  )
}
