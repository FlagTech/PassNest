import { cn } from "../../lib/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-3xl p-5 shadow-card border border-purple-light/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
