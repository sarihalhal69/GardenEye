import * as React from "react"
import { toast as sonnerToast } from "sonner"

export const useToast = () => {
  const toast = React.useCallback(
    (props: {
      title?: React.ReactNode
      description?: React.ReactNode
      variant?: "default" | "destructive"
    }) => {
      if (props.variant === "destructive") {
        sonnerToast.error(props.title, {
          description: props.description,
        })
      } else {
        sonnerToast(props.title, {
          description: props.description,
        })
      }
    },
    []
  )

  return { toast }
}
