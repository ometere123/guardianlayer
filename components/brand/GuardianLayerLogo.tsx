import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function GuardianLayerLogo({ size = "md", showText = true, className }: LogoProps) {
  const dims = { sm: 24, md: 32, lg: 40 };
  const d = dims[size];
  const textSize = { sm: "text-sm", md: "text-base", lg: "text-lg" };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Shield glyph */}
      <svg width={d} height={d} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M20 3L5 9V20C5 28.5 11.5 36.2 20 38C28.5 36.2 35 28.5 35 20V9L20 3Z"
          fill="#0D111C"
          stroke="#38BDF8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M20 9L10 13.5V21C10 26.25 14.4 31.2 20 33C25.6 31.2 30 26.25 30 21V13.5L20 9Z"
          fill="#071e2e"
          stroke="#8B5CF6"
          strokeWidth="1"
          strokeLinejoin="round"
          strokeDasharray="2 1"
        />
        {/* Eye / scan line */}
        <circle cx="20" cy="21" r="3" fill="#38BDF8" opacity="0.9" />
        <line x1="14" y1="21" x2="18" y2="21" stroke="#38BDF8" strokeWidth="1" opacity="0.5" />
        <line x1="22" y1="21" x2="26" y2="21" stroke="#38BDF8" strokeWidth="1" opacity="0.5" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display font-bold tracking-widest text-[#F4F7FB]",
              textSize[size]
            )}
          >
            GUARDIAN
          </span>
          <span
            className={cn(
              "font-display font-light tracking-[0.3em] text-[#38BDF8]",
              size === "sm" ? "text-[9px]" : size === "md" ? "text-[11px]" : "text-xs"
            )}
          >
            LAYER
          </span>
        </div>
      )}
    </div>
  );
}

export function ShieldGlyph({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M20 3L5 9V20C5 28.5 11.5 36.2 20 38C28.5 36.2 35 28.5 35 20V9L20 3Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="21" r="3" fill="currentColor" />
    </svg>
  );
}
