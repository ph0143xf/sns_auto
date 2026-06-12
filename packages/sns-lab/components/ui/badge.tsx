import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors border",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-[var(--primary)] text-white",
        secondary:   "border-[var(--border)] bg-[var(--secondary)] text-[var(--secondary-foreground)]",
        destructive: "border-transparent bg-red-50 text-red-700 border-red-100",
        success:     "border-transparent bg-green-50 text-green-700 border-green-100",
        warning:     "border-transparent bg-amber-50 text-amber-700 border-amber-100",
        outline:     "text-[var(--foreground)] border-[var(--border)] bg-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
