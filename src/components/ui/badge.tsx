import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5",
    "text-xs font-semibold whitespace-nowrap shrink-0 w-fit",
    "[&>svg]:size-3 [&>svg]:pointer-events-none",
    "focus-visible:shadow-[var(--focus-ring)] overflow-hidden",
    "transition-colors duration-150",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary border-primary/15 dark:bg-main/10 dark:text-main dark:border-main/20",
        secondary:
          "bg-secondary text-secondary-foreground border-border",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/15 dark:bg-destructive/10 dark:text-[hsl(0_63%_65%)] dark:border-destructive/20",
        success:
          "bg-[hsl(142_71%_45%/0.1)] text-[hsl(142_71%_32%)] border-[hsl(142_71%_45%/0.2)] dark:text-[hsl(142_60%_55%)] dark:bg-[hsl(142_65%_42%/0.1)] dark:border-[hsl(142_65%_42%/0.2)]",
        warning:
          "bg-[hsl(38_96%_50%/0.1)] text-[hsl(38_80%_30%)] border-[hsl(38_96%_50%/0.2)] dark:text-[hsl(38_90%_62%)] dark:bg-[hsl(38_90%_48%/0.1)] dark:border-[hsl(38_90%_48%/0.2)]",
        outline:
          "bg-transparent text-foreground border-border",
        neutral:
          "bg-muted text-muted-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
