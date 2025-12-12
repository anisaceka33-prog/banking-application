import type { HTMLAttributes, ReactNode } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-beige-300 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className = "", children, ...props }: CardProps) {
  return (
    <div className={`px-6 py-4 border-b border-beige-200 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className = "", children, ...props }: CardProps) {
  return (
    <div className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  )
}
