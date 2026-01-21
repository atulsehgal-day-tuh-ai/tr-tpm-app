"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  items: Array<{ key: T; label: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border bg-white/70 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/50",
        className
      )}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Button
            key={it.key}
            type="button"
            size="sm"
            variant={active ? "default" : "ghost"}
            className={cn(
              "h-8 px-3 text-xs",
              active ? "" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onChange(it.key)}
          >
            {it.label}
          </Button>
        );
      })}
    </div>
  );
}

