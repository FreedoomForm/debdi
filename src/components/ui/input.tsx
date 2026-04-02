import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        [
          "flex h-9 w-full rounded-[var(--radius)] border border-border bg-card px-3 py-2",
          "text-sm text-foreground placeholder:text-muted-foreground",
          "transition-[border-color,box-shadow] duration-150",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[var(--focus-ring)]",
          "dark:focus-visible:border-main",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          "selection:bg-primary/15 selection:text-foreground dark:selection:bg-main/20",
        ].join(" "),
        className,
      )}
      {...props}
    />
  )
}

export { Input }
