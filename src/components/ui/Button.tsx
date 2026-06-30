import { cn } from "../../lib/cn";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium rounded-2xl transition-all duration-200 cursor-pointer select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-pink text-white hover:bg-pink-dark active:scale-95 shadow-sm": variant === "primary",
          "bg-purple-light text-slate hover:bg-purple active:scale-95": variant === "secondary",
          "bg-transparent text-slate-light hover:bg-pink-light/30 active:scale-95": variant === "ghost",
          "bg-red-100 text-red-600 hover:bg-red-200 active:scale-95": variant === "danger",
          "px-3 py-1.5 text-sm": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
