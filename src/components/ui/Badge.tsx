import { cn } from "../../lib/cn";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "pink" | "mint" | "purple" | "orange" | "gray";
}

export function Badge({ variant = "purple", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        {
          "bg-pink-light text-pink-dark": variant === "pink",
          "bg-mint-light text-mint-dark": variant === "mint",
          "bg-purple-light text-purple-dark": variant === "purple",
          "bg-orange-100 text-orange-600": variant === "orange",
          "bg-gray-100 text-gray-600": variant === "gray",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
