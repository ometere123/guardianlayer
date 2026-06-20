"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "genlayer" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:   "bg-[#38BDF8] text-[#070A12] hover:bg-[#7DD3FC] border border-[#38BDF8] font-bold",
      secondary: "bg-transparent text-[#F4F7FB] hover:bg-[#121827] border border-[#243044]",
      genlayer:  "bg-[#8B5CF6] text-[#F4F7FB] hover:bg-[#7C3AED] border border-[#8B5CF6] font-bold",
      danger:    "bg-[#EF4444] text-[#F4F7FB] hover:bg-[#DC2626] border border-[#EF4444] font-bold",
      ghost:     "bg-transparent text-[#9AA7B8] hover:text-[#F4F7FB] hover:bg-[#121827] border border-transparent",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs rounded-[8px] h-8",
      md: "px-4 py-2.5 text-sm rounded-[8px] h-10",
      lg: "px-5 py-3 text-sm rounded-[8px] h-11",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 transition-all duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "font-medium tracking-wide",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
