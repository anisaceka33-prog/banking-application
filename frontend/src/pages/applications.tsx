"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { bankingService } from "../services/banking-service"
import { MainLayout } from "../components/layout/main-layout"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Modal } from "../components/ui/modal"
import { formatCurrency, formatDate } from "../utils/helpers"
import { X } from "lucide-react"
import type { BankAccount, Card as CardType } from "../types"

interface RejectionForm {
  reason: string
}

export function ApplicationsPage() {
  const [pendingAccounts, setPendingAccounts] = useState<BankAccount[]>([])
  const [pendingCards, setPendingCards] = useState<CardType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean
    type: "account" | "card"
    id: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectionForm>()

  const fetchApplications = async () => {
    try {
      const [accountsRes, cardsRes] = await Promise.all([
        bankingService.getPendingAccounts(),
        bankingService.getPendingCards(),
      ])
      setPendingAccounts(accountsRes.results)
      setPendingCards(cardsRes.results)
    } catch (error) {
      toast.error("Failed to load applications")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const handleApprove = async (type: "account" | "card", id: string) => {
    setProcessingId(id)
    try {
      if (type === "account") {
        await bankingService.processAccountApplication(id, { action: "approve" })
      } else {
        await bankingService.processCardApplication(id, { action: "approve" })
      }
      toast.success("Application approved!")
      fetchApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to approve")
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (data: RejectionForm) => {
    if (!rejectionModal) return

    setProcessingId(rejectionModal.id)
    try {
      if (rejectionModal.type === "account") {
        await bankingService.processAccountApplication(rejectionModal.id, {
          action: "reject",
          reason: data.reason,
        })
      } else {
        await bankingService.processCardApplication(rejectionModal.id, {
          action: "reject",
          reason: data.reason,
        })
      }
      toast.success("Application rejected")
      setRejectionModal(null)
      reset()
      fetchApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to reject")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <MainLayout allowedRoles={["BANKER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Applications</h1>
          <p className="text-gray-500"></p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-6">
                  <div className="h-24 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-semibold mb-4">Bank Account Applications ({pendingAccounts.length})</h2>
               
                <div className="space-y-4">
                  {pendingAccounts.map((account) => (
                    <Card key={account.id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{account.client_name}</p>
                            <p className="text-sm text-gray-500">{account.client_email}</p>
                            <p className="text-sm text-gray-400">IBAN: {account.iban}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove("account", account.id)}
                              isLoading={processingId === account.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setRejectionModal({ isOpen: true, type: "account", id: account.id })}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-4">Card Applications ({pendingCards.length})</h2>
      
                <div className="space-y-4">
                  {pendingCards.map((card) => (
                    <Card key={card.id}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{card.client_name}</p>
                            <p className="text-sm text-gray-500">{card.client_email}</p>
                            <p className="text-sm text-gray-400">Linked Account: {card.account_iban}</p>
                            <p className="text-sm text-gray-400">
                              Monthly Salary: {formatCurrency(card.monthly_salary)}
                            </p>
                            <p className="text-sm text-gray-400">Applied: {formatDate(card.created_at)}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove("card", card.id)}
                              isLoading={processingId === card.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setRejectionModal({ isOpen: true, type: "card", id: card.id })}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
            </section>
          </>
        )}

        <Modal
          isOpen={!!rejectionModal}
          onClose={() => {
            setRejectionModal(null)
            reset()
          }}
          title="Reject Application"
        >
          <form onSubmit={handleSubmit(handleReject)} className="space-y-4">
            <Input
              label="Rejection Reason"
              id="reason"
              error={errors.reason?.message}
              {...register("reason", { required: "Rejection reason is required" })}
            />
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setRejectionModal(null)
                  reset()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="danger" isLoading={!!processingId}>
                Reject Application
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  )
}
