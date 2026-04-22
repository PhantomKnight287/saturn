import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { Loader2 } from "lucide-react"
import { useHotkeys } from "react-hotkeys-hook"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"
import { buttonVariants } from "./button-variants"



function Button({
  className,
  variant = "default",
  size = "sm",
  asChild = false,
  loading = false,
  disabled = false,
  kbd,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    kbd?: string
  }) {
  const Comp = asChild ? Slot.Root : "button"

  useHotkeys(
    kbd ?? "",
    (event) => {
      event.preventDefault()
      props.onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>)
    },
    {
      enabled: Boolean(kbd) && !disabled && !loading,
      enableOnFormTags: false,
      enableOnContentEditable: false,
    },
    [kbd, disabled, loading, props.onClick]
  )

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : asChild ? (
        children
      ) : (
        <>
          {children}
          {kbd && (
            <Kbd
              className={cn(
                variant === "default" &&
                  "bg-primary-foreground/15 text-primary-foreground",
                variant === "secondary" &&
                  "bg-secondary-foreground/10 text-secondary-foreground",
                variant === "destructive" &&
                  "bg-destructive/15 text-destructive dark:bg-destructive/30"
              )}
            >
              {kbd}
            </Kbd>
          )}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
