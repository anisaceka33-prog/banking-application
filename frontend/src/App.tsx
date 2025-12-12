import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { LoginPage } from "./pages/login"
import { DashboardPage } from "./pages/dashboard"
import { AccountsPage } from "./pages/accounts"
import { CardsPage } from "./pages/cards"
import { TransactionsPage } from "./pages/transactions"
import { TransferPage } from "./pages/transfer"
import { ApplicationsPage } from "./pages/applications"
import { BankersPage } from "./pages/bankers"
import { ClientsPage } from "./pages/clients"

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute allowedRoles={["CLIENT", "BANKER"]}>
              <AccountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cards"
          element={
            <ProtectedRoute allowedRoles={["CLIENT", "BANKER"]}>
              <CardsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute allowedRoles={["CLIENT", "BANKER"]}>
              <TransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfer"
          element={
            <ProtectedRoute allowedRoles={["CLIENT"]}>
              <TransferPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <ProtectedRoute allowedRoles={["BANKER"]}>
              <ApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bankers"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <BankersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute allowedRoles={["BANKER"]}>
              <ClientsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
