"use client"

import { useTheme } from "next-themes"
import {
  Toaster as Sonner,
  toast as sonnerToast,
  type ExternalToast,
  type ToasterProps,
} from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react"

// Sonner injects unlayered CSS, which beats Tailwind's layered utilities, so
// every override here is marked important (motion lives in globals.css)
const surface = "bg-popover! text-popover-foreground! border-border!"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      mobileOffset={16}
      expand
      closeButton
      icons={{
        success: <CircleCheckIcon />,
        info: <InfoIcon />,
        warning: <TriangleAlertIcon />,
        error: <OctagonXIcon />,
        loading: <Loader2Icon className="animate-spin" />,
        close: <XIcon className="size-4" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius-lg)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast items-start! gap-3! rounded-lg! border! font-sans! text-base! shadow-popover!",
          title: "font-semibold! leading-[1.6]!",
          description: "text-sm! leading-[1.6]! text-current!",
          icon: "mt-0.5! size-5! [&_svg]:size-5!",
          closeButton:
            "static! order-last! size-6! shrink-0 transform-none! rounded-md! border-0! bg-transparent! text-current! hover:bg-current/10! focus-visible:outline-current!",
          default: surface,
          info: surface,
          loading: surface,
          success: "bg-success! text-success-foreground! border-transparent!",
          warning: "bg-warning! text-warning-foreground! border-transparent!",
          error:
            "bg-destructive! text-destructive-foreground! border-transparent!",
        },
      }}
      {...props}
    />
  )
}

// Plain toast() has no type, so Sonner shows no icon; give it the info icon
// so colour is never the only signal. Import toast from here, not "sonner"
function withInfoIcon(data?: ExternalToast): ExternalToast {
  return { icon: <InfoIcon />, ...data }
}

const toast: typeof sonnerToast = Object.assign(
  (message: Parameters<typeof sonnerToast>[0], data?: ExternalToast) =>
    sonnerToast(message, withInfoIcon(data)),
  sonnerToast,
  {
    message: (
      message: Parameters<typeof sonnerToast.message>[0],
      data?: ExternalToast,
    ) => sonnerToast.message(message, withInfoIcon(data)),
  },
)

export { Toaster, toast }
