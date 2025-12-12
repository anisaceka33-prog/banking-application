"use client"

import { NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../store/auth-store"

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const navItems = {
    ADMIN: [
      { path: "/dashboard", label: "Dashboard" },
      { path: "/bankers", label: "Manage Bankers" },
    ],
    BANKER: [
      { path: "/dashboard", label: "Dashboard" },
      { path: "/clients", label: "Manage Clients" },
      { path: "/applications", label: "Applications" },
      { path: "/accounts", label: "All Accounts" },
      { path: "/cards", label: "All Cards" },
      { path: "/transactions", label: "All Transactions" },
    ],
    CLIENT: [
      { path: "/dashboard", label: "Dashboard" },
      { path: "/accounts", label: "My Accounts" },
      { path: "/cards", label: "My Cards" },
      { path: "/transactions", label: "Transactions" },
      { path: "/transfer", label: "New Transfer" },
    ],
  }

  const items = user ? navItems[user.role] || [] : []

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-beige-800 text-beige-50">
      <div className="flex flex-col h-full">
        <div className="px-6 py-6 border-b border-beige-700">
          <h1 className="text-xl font-bold text-beige-50">Banking App</h1>
          <p className="text-sm text-beige-300 mt-1">{user?.role}</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? "bg-beige-600 text-white" : "text-beige-200 hover:bg-beige-700"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-beige-700">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm font-medium text-beige-50">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-beige-300">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-beige-200 hover:bg-beige-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}
