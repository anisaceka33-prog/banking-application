"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { userService } from "../services/user-service"
import { MainLayout } from "../components/layout/main-layout"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Modal } from "../components/ui/modal"
import { formatDate } from "../utils/helpers"
import { Edit, Trash2 } from "lucide-react"
import type { User, CreateBankerPayload, PaginatedResponse } from "../types"

export function BankersPage() {
  const [bankers, setBankers] = useState<PaginatedResponse<User> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingBanker, setEditingBanker] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const createForm = useForm<CreateBankerPayload>()
  const editForm = useForm<Partial<User>>()

  const fetchBankers = async () => {
    try {
      const data = await userService.getBankers()
      setBankers(data)
    } catch (error) {
      toast.error("Failed to load bankers")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBankers()
  }, [])

  const onSubmit = async (data: CreateBankerPayload) => {
    setIsSubmitting(true)
    try {
      await userService.createBanker(data)
      toast.success("Banker created successfully!")
      setIsModalOpen(false)
      createForm.reset()
      fetchBankers()
    } catch (error: any) {
      const errors = error.response?.data
      const message = errors?.email?.[0] || errors?.password?.[0] || "Failed to create banker"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (banker: User) => {
    setEditingBanker(banker)
    editForm.reset({
      first_name: banker.first_name,
      last_name: banker.last_name,
      email: banker.email,
      phone_number: banker.phone_number || "",
      is_active: banker.is_active,
    })
    setIsEditModalOpen(true)
  }

  const onEditSubmit = async (data: Partial<User>) => {
    if (!editingBanker) return

    setIsSubmitting(true)
    try {
      await userService.updateBanker(editingBanker.id, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
        is_active: data.is_active,
      })
      toast.success("Banker updated successfully!")
      setIsEditModalOpen(false)
      setEditingBanker(null)
      editForm.reset()
      fetchBankers()
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to update banker"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this banker?")) return

    setDeletingId(id)
    try {
      await userService.deleteBanker(id)
      toast.success("Banker deleted")
      fetchBankers()
    } catch (error) {
      toast.error("Failed to delete banker")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredBankers = bankers?.results.filter((banker) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      banker.full_name?.toLowerCase().includes(query) ||
      banker.email?.toLowerCase().includes(query)
    )
  })

  return (
    <MainLayout allowedRoles={["ADMIN"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Bankers</h1>
            <p className="text-gray-500">Create and manage banker accounts</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            Add Banker
          </Button>
        </div>

        <div className="max-w-md">
          <Input
            type="text"
            placeholder="Search by banker name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-6">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !filteredBankers || filteredBankers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">{searchQuery ? "No bankers match your search" : "No bankers found"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBankers.map((banker) => (
              <Card key={banker.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{banker.full_name}</p>
                        <Badge variant={banker.is_active ? "success" : "danger"}>
                          {banker.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{banker.email}</p>
                      <p className="text-sm text-gray-400">Joined: {formatDate(banker.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(banker)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(banker.id)}
                        isLoading={deletingId === banker.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Banker">
          <form onSubmit={createForm.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                id="first_name"
                error={createForm.formState.errors.first_name?.message}
                {...createForm.register("first_name", { required: "First name is required" })}
              />
              <Input
                label="Last Name"
                id="last_name"
                error={createForm.formState.errors.last_name?.message}
                {...createForm.register("last_name", { required: "Last name is required" })}
              />
            </div>

            <Input
              label="Email"
              type="email"
              id="email"
              error={createForm.formState.errors.email?.message}
              {...createForm.register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
            />

            <Input
              label="Password"
              type="password"
              id="password"
              error={createForm.formState.errors.password?.message}
              {...createForm.register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
              })}
            />

            <Input
              label="Confirm Password"
              type="password"
              id="password_confirm"
              error={createForm.formState.errors.password_confirm?.message}
              {...createForm.register("password_confirm", { required: "Please confirm password" })}
            />

            <Input label="Phone Number (optional)" id="phone_number" {...createForm.register("phone_number")} />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => {
                setIsModalOpen(false)
                createForm.reset()
              }}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Create Banker
              </Button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Banker">
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                id="edit_first_name"
                error={editForm.formState.errors.first_name?.message}
                {...editForm.register("first_name")}
              />
              <Input
                label="Last Name"
                id="edit_last_name"
                error={editForm.formState.errors.last_name?.message}
                {...editForm.register("last_name")}
              />
            </div>

            <Input
              label="Email"
              type="email"
              id="edit_email"
              error={editForm.formState.errors.email?.message}
              {...editForm.register("email")}
            />

            <Input label="Phone Number (optional)" id="edit_phone_number" {...editForm.register("phone_number")} />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit_is_active"
                className="h-4 w-4 rounded border-gray-300"
                {...editForm.register("is_active")}
                checked={editForm.watch("is_active")}
                onChange={(e) => editForm.setValue("is_active", e.target.checked)}
              />
              <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => {
                setIsEditModalOpen(false)
                setEditingBanker(null)
                editForm.reset()
              }}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Update Banker
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  )
}
