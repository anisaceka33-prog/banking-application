"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { useAuthStore } from "../store/auth-store"
import { bankingService } from "../services/banking-service"
import { MainLayout } from "../components/layout/main-layout"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Select } from "../components/ui/select"
import { Badge } from "../components/ui/badge"
import { Modal } from "../components/ui/modal"
import { formatCurrency, formatDate } from "../utils/helpers"
import type { Card as CardType, BankAccount, PaginatedResponse } from "../types"

interface CardForm {
  bank_account: string
  monthly_salary: string
}

export function CardsPage() {
  const { user } = useAuthStore()
  const [cards, setCards] = useState<PaginatedResponse<CardType> | null>(null)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CardForm>()

  const fetchData = async () => {
    try {
      const [cardsData, accountsData] = await Promise.all([bankingService.getCards(), bankingService.getAccounts()])
      setCards(cardsData)
      const eligibleAccounts = accountsData.results.filter((a) => a.status === "APPROVED" && !a.has_linked_card)
      setAccounts(eligibleAccounts)
    } catch (error) {
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const onSubmit = async (data: CardForm) => {
    setIsSubmitting(true)
    try {
      await bankingService.createCard({
        bank_account: data.bank_account,
        monthly_salary: Number.parseFloat(data.monthly_salary),
      })
      toast.success("Card application submitted!")
      setIsModalOpen(false)
      reset()
      fetchData()
    } catch (error: any) {
      const message =
        error.response?.data?.bank_account?.[0] ||
        error.response?.data?.monthly_salary?.[0] ||
        error.response?.data?.detail ||
        "Failed to submit application"
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

  const filteredCards = cards?.results.filter((card) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      card.client_name?.toLowerCase().includes(query) ||
      card.client_email?.toLowerCase().includes(query)
    )
  })

  return (
    <MainLayout allowedRoles={["CLIENT", "BANKER"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user?.role === "CLIENT" ? "My Cards" : "All Cards"}</h1>
            <p className="text-gray-500">
              {user?.role === "CLIENT" ? "View and manage your debit cards" : "View all customer cards"}
            </p>
          </div>
          {user?.role === "CLIENT" && accounts.length > 0 && (
            <Button onClick={() => setIsModalOpen(true)}>
              New Card
            </Button>
          )}
        </div>

        {user?.role === "BANKER" && (
          <div className="max-w-md">
            <Input
              type="text"
              placeholder="Search by client name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-6">
                  <div className="h-40 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !filteredCards || filteredCards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">{searchQuery ? "No cards match your search" : "No cards found"}</p>
              {user?.role === "CLIENT" && accounts.length > 0 && (
                <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
                  Apply for your first card
                </Button>
              )}
              {user?.role === "CLIENT" && accounts.length === 0 && (
                <p className="text-sm text-gray-400 mt-2">You need a bank account to apply for a card</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCards.map((card) => (
              <Card key={card.id}>
                <CardContent className="py-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-lg font-medium">{card.masked_number}</p>
                      <Badge variant={getStatusBadgeVariant(card.status)}>{card.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">Account: {card.account_iban}</p>
                    <p className="text-sm text-gray-500">Salary: {formatCurrency(card.monthly_salary)}</p>
                    {card.expiry_date && (
                      <p className="text-sm text-gray-400">Expires: {formatDate(card.expiry_date)}</p>
                    )}
                    {card.rejection_reason && (
                      <p className="text-sm text-red-600">Rejection: {card.rejection_reason}</p>
                    )}
                    {user?.role === "BANKER" && (
                      <p className="text-sm text-gray-500">Client: {card.client_name} ({card.client_email})</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Apply for Debit Card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-700">
              Monthly salary must be at least €500.
              </p>
            </div>

            <Select
              label="Select Bank Account"
              id="bank_account"
              options={accounts.map((a) => ({
                value: a.id,
                label: `${a.iban} (${formatCurrency(a.balance)})`,
              }))}
              error={errors.bank_account?.message}
              {...register("bank_account", { required: "Please select an account" })}
            />

            <Input
              label="Monthly Salary (€)"
              type="number"
              id="monthly_salary"
              step="0.01"
              error={errors.monthly_salary?.message}
              {...register("monthly_salary", {
                required: "Monthly salary is required",
              })}
            />

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
      </div>
    </MainLayout>
  )
}
