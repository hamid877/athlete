import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  let variantClasses = "";
  switch (variant) {
    case "default":
      variantClasses = "bg-primary text-primary-foreground hover:bg-primary/80";
      break;
    case "secondary":
      variantClasses = "bg-secondary text-secondary-foreground hover:bg-secondary/80";
      break;
    case "destructive":
      variantClasses = "bg-destructive text-destructive-foreground hover:bg-destructive/80";
      break;
    case "success":
      variantClasses = "bg-green-500/15 text-green-700 dark:text-green-400";
      break;
    case "warning":
      variantClasses = "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
      break;
    case "outline":
      variantClasses = "text-foreground border border-input";
      break;
  }

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses} ${className || ""}`}
      {...props}
    />
  )
}
