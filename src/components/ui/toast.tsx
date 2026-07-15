import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

const ToastProvider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={className} {...props} />
))
ToastProvider.displayName = "ToastProvider"

const ToastViewport = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
    {...props}
  />
))
ToastViewport.displayName = "ToastViewport"

// Minimal toaster implementation using Sonner since it's in package.json
import { Toaster as Sonner } from "sonner"
import { useTheme } from "next-themes"

function Toaster() {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as "light" | "dark" | "system" | undefined}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
    />
  )
}

export { Toaster, ToastProvider, ToastViewport }
