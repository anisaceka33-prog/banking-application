import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuthStore } from "../../store/auth-store"
import { Sidebar } from "./sidebar"
import type { UserRole } from "../../types"

interface MainLayoutProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

export function MainLayout({ children, allowedRoles }: MainLayoutProps) {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-beige-50">
      <Sidebar />
      <main className="ml-64 p-8">{children}</main>
    </div>
  )
}
