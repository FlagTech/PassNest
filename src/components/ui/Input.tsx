import { cn } from "../../lib/cn";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, suffix, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-slate">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            className={cn(
              "w-full px-4 py-2.5 rounded-2xl border-2 bg-white text-slate text-sm",
              "border-purple-light focus:border-pink focus:outline-none",
              "placeholder:text-slate-light/60 transition-colors duration-200",
              suffix && "pr-12",
              error && "border-red-300 focus:border-red-400",
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 flex items-center">{suffix}</div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
