import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)]",
    "text-sm font-semibold tracking-[0.005em] select-none cursor-pointer",
    "transition-[background-color,box-shadow,transform,border-color] duration-150 ease-out",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97] active:translate-y-px",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Primary — brand navy / amber dark */
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] " +
          "hover:bg-[hsl(222_62%_17%)] hover:shadow-[var(--shadow-md)] " +
          "dark:bg-main dark:text-main-foreground dark:hover:bg-[hsl(39_96%_46%)]",

        /* Outlined ghost with border */
        outline:
          "bg-card text-foreground border border-border shadow-[var(--shadow-xs)] " +
          "hover:bg-muted hover:shadow-[var(--shadow-sm)]",

        /* Subtle filled */
        secondary:
          "bg-secondary text-secondary-foreground border border-border shadow-[var(--shadow-xs)] " +
          "hover:bg-muted hover:shadow-[var(--shadow-sm)]",

        /* Transparent */
        ghost:
          "bg-transparent text-foreground border border-transparent " +
          "hover:bg-muted hover:border-border",

        /* Danger */
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-sm)] " +
          "hover:bg-[hsl(0_72%_46%)] hover:shadow-[var(--shadow-md)]",

        /* Success */
        success:
          "bg-[hsl(142_71%_45%)] text-white shadow-[var(--shadow-sm)] " +
          "hover:bg-[hsl(142_71%_40%)] hover:shadow-[var(--shadow-md)]",

        /* Warning */
        warning:
          "bg-[hsl(38_96%_50%)] text-[hsl(220_15%_8%)] shadow-[var(--shadow-sm)] " +
          "hover:bg-[hsl(38_96%_44%)] hover:shadow-[var(--shadow-md)]",

        /* Text link */
        link:
          "bg-transparent text-primary border-0 underline-offset-4 hover:underline " +
          "shadow-none px-0 h-auto dark:text-main",

        /* No shadow brand */
        noShadow: "bg-primary text-primary-foreground border border-primary/20 dark:bg-main dark:text-main-foreground",

        /* Neutral */
        neutral:
          "bg-secondary text-foreground border border-border shadow-[var(--shadow-xs)] " +
          "hover:bg-muted",

        /* Reverse — inverted on hover */
        reverse:
          "bg-primary text-primary-foreground border border-primary/20 shadow-[var(--shadow-sm)] " +
          "hover:bg-[hsl(222_62%_26%)] hover:shadow-[var(--shadow-md)] " +
          "dark:bg-main dark:text-main-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 px-3 text-xs rounded-[calc(var(--radius)-2px)]",
        lg:      "h-11 px-6 text-base",
        xl:      "h-12 px-8 text-base",
        icon:    "size-9 p-0",
        "icon-sm": "size-8 p-0 rounded-[calc(var(--radius)-2px)]",
        "icon-lg": "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
