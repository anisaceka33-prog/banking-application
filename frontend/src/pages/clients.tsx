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
import type { User, CreateClientPayload, PaginatedResponse } from "../types"

export function ClientsPage() {
  const [clients, setClients] = useState<PaginatedResponse<User> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const createForm = useForm<CreateClientPayload>()
  const editForm = useForm<Partial<User>>()


  const fetchClients = async () => {
    try {
      const data = await userService.getClients()
      setClients(data)
    } catch {
      toast.error("Failed to load clients")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const onCreate = async (data: CreateClientPayload) => {
    setSubmitting(true)
    try {
      await userService.createClient(data)
      toast.success("Client created successfully")
      setAddModal(false)
      createForm.reset()
      fetchClients()
    } catch (error: any) {
      const err = error.response?.data
      toast.error(err?.email?.[0] || err?.password?.[0] || "Failed to create client")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (client: User) => {
    setEditing(client)
    editForm.reset({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone_number: client.phone_number,
      address: client.address,
      is_active: client.is_active,
    })
    setEditModal(true)
  }

  const onEdit = async (data: Partial<User>) => {
    if (!editing) return

    setSubmitting(true)
    try {
      await userService.updateClient(editing.id, data)
      toast.success("Client updated successfully")
      setEditModal(false)
      setEditing(null)
      editForm.reset()
      fetchClients()
    } catch {
      toast.error("Failed to update client")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return

    setDeletingId(id)
    try {
      await userService.deleteClient(id)
      toast.success("Client deleted")
      fetchClients()
    } catch {
      toast.error("Failed to delete client")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredClients = clients?.results.filter((client) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      client.full_name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query)
    )
  })

  return (
    <MainLayout allowedRoles={["BANKER"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Manage Clients</h1>
            <p className="text-gray-500">Create and manage client accounts</p>
          </div>

          <Button onClick={() => { createForm.reset(); setAddModal(true) }}>
            Add Client
          </Button>
        </div>

        <div className="max-w-md">
          <Input
            type="text"
            placeholder="Search by client name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-6">
                  <div className="h-16 bg-gray-200 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !filteredClients || filteredClients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">{searchQuery ? "No clients" : "No clients found"}</p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setAddModal(true)}>
                  Add your first client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredClients.map((client) => (
              <Card key={client.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{client.full_name}</p>
                        <Badge variant={client.is_active ? "success" : "danger"}>
                          {client.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{client.email}</p>
                      {client.phone_number && <p className="text-sm text-gray-400">Phone: {client.phone_number}</p>}
                      {client.address && <p className="text-sm text-gray-400">Address: {client.address}</p>}
                      {client.date_of_birth && <p className="text-sm text-gray-400">DOB: {formatDate(client.date_of_birth)}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(client)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(client.id)}
                        isLoading={deletingId === client.id}
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

        {/* CREATE MODAL */}
        <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add New Client">
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
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

            <Input label="Address (optional)" id="address" {...createForm.register("address")} />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => { setAddModal(false); createForm.reset() }}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting}>
                Create Client
              </Button>
            </div>
          </form>
        </Modal>

        {}
        <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Client">
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
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

            <Input label="Address (optional)" id="edit_address" {...editForm.register("address")} />

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
              <Button type="button" variant="secondary" onClick={() => { setEditModal(false); setEditing(null); editForm.reset() }}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting}>
                Update Client
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  )
}
