import { cn } from "../../lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-6 h-6 rounded-full border-2 border-pink-light border-t-pink animate-spin",
        className
      )}
    />
  );
}
