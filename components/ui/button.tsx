import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "xs";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
          variant === "default" &&
            "bg-primary text-primary-foreground hover:bg-primary/90",
          variant === "secondary" &&
            "bg-muted text-foreground hover:bg-muted/80",
          variant === "outline" &&
            "border border-border bg-background hover:bg-muted/50",
          variant === "ghost" && "hover:bg-muted/60",
          size === "default" && "h-9 px-3",
          size === "sm" && "h-8 px-2.5 text-xs",
          size === "xs" && "h-7 px-2 text-xs",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

