import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  "data-state"?: "default" | "success" | "warning" | "error" | "loading";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, "data-state": validationState, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // Validation state styles
          validationState === "error" && "border-destructive focus-visible:ring-destructive",
          validationState === "success" && "border-success focus-visible:ring-success",
          validationState === "warning" && "border-warning focus-visible:ring-warning",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
