"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import { authService } from "../services/auth-service"
import { useAuthStore } from "../store/auth-store"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader } from "../components/ui/card"

interface LoginForm {
  email: string
  password: string
}

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const response = await authService.login(data.email, data.password)
      setUser(response.user)
      toast.success("Welcome back!")
      navigate("/dashboard")
    } catch (error: any) {
      const message = error.response?.data?.detail || "Invalid credentials"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-beige-50 to-beige-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center text-beige-900">Banking Application</h1>
          <p className="text-beige-600 text-center mt-1">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              id="email"
              placeholder="email"
              error={errors.email?.message}
              {...register("email", {
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
              placeholder=""
              error={errors.password?.message}
              {...register("password", { required: "Password is required" })}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
