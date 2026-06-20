"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-[#9AA7B8]">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full h-10 px-3 rounded-[12px] text-sm",
            "bg-[#121827] border border-[#243044]",
            "text-[#F4F7FB] placeholder:text-[#64748B]",
            "focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30",
            "transition-colors duration-150",
            error && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-[#64748B]">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-[#EF4444]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-[#9AA7B8]">{label}</label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full px-3 py-2.5 rounded-[12px] text-sm resize-none",
            "bg-[#121827] border border-[#243044]",
            "text-[#F4F7FB] placeholder:text-[#64748B]",
            "focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/30",
            "transition-colors duration-150",
            error && "border-[#EF4444]",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-[#64748B]">{hint}</p>}
        {error && <p className="text-xs text-[#EF4444]">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Input, Textarea };
