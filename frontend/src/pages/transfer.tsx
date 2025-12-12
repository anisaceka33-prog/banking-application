"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { bankingService } from "../services/banking-service"
import { MainLayout } from "../components/layout/main-layout"
import { Card, CardContent, CardHeader } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Select } from "../components/ui/select"
import { formatCurrency, generateIdempotencyKey } from "../utils/helpers"
import type { BankAccount } from "../types"

interface TransferForm {
  source_account: string
  target_iban: string
  amount: string
  description: string
}

export function TransferPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey())

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TransferForm>()

  const selectedAccountId = watch("source_account")
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await bankingService.getAccounts()
        const eligibleAccounts = data.results.filter((a) => a.status === "APPROVED" && a.has_linked_card)
        setAccounts(eligibleAccounts)
      } catch (error) {
        toast.error("Failed to load accounts")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  const onSubmit = async (data: TransferForm) => {
    setIsSubmitting(true)
    try {
      await bankingService.createTransaction({
        source_account: data.source_account,
        target_iban: data.target_iban.replace(/\s/g, "").toUpperCase(),
        amount: Number.parseFloat(data.amount),
        description: data.description || "Transfer",
        idempotency_key: idempotencyKey,
      })
      toast.success("Transfer completed successfully!")
      reset()
      setIdempotencyKey(generateIdempotencyKey())
    } catch (error: any) {
      const errorData = error.response?.data
      const message =
        errorData?.amount?.[0] ||
        errorData?.source_account?.[0] ||
        errorData?.target_iban?.[0] ||
        errorData?.idempotency_key?.[0] ||
        errorData?.detail ||
        "Transfer failed"
      toast.error(message)

      if (errorData?.idempotency_key?.[0]?.includes('already processed')) {
        setIdempotencyKey(generateIdempotencyKey())
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MainLayout allowedRoles={["CLIENT"]}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Transfer</h1>
          <p className="text-gray-500">Send money to another account</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Transfer Details</h2>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">No eligible accounts for transfer</p>
                <p className="text-sm text-gray-400">
                  You need an active account with a linked debit card to make transfers
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Select
                  label="From Account"
                  id="source_account"
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: `${a.iban} (${formatCurrency(a.balance)})`,
                  }))}
                  error={errors.source_account?.message}
                  {...register("source_account", { required: "Please select an account" })}
                />

                {selectedAccount && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Available balance: <strong>{formatCurrency(selectedAccount.balance)}</strong>
                    </p>
                  </div>
                )}

                <Input
                  label="Target IBAN"
                  id="target_iban"
                  error={errors.target_iban?.message}
                  {...register("target_iban", {
                    required: "Target IBAN is required",
                    pattern: {
                      value: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/i,
                      message: "Invalid IBAN format",
                    },
                  })}
                />

                <Input
                  label="Amount (€)"
                  type="number"
                  id="amount"
                  step="0.01"
                  placeholder="0.00"
                  error={errors.amount?.message}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 0.01, message: "Minimum amount is €0.01" },
                    max: {
                      value: selectedAccount?.balance || 0,
                      message: "Insufficient balance",
                    },
                  })}
                />

                <Input
                  label="Description (optional)"
                  id="description"
                  {...register("description")}
                />

                <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
                  Send Transfer
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
