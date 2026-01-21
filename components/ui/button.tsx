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
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "default" &&
            [
              "text-primary-foreground shadow-sm",
              "bg-gradient-to-r from-sky-600 via-cyan-500 to-emerald-500",
              "hover:brightness-[1.03] active:brightness-[0.98]",
            ].join(" "),
          variant === "secondary" &&
            "bg-white/70 text-foreground border border-border hover:bg-white shadow-sm backdrop-blur",
          variant === "outline" &&
            "border border-border bg-white/60 hover:bg-white shadow-sm backdrop-blur",
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

