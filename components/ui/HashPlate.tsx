"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { truncateHash, truncateAddress, cn } from "@/lib/utils";

interface HashPlateProps {
  value: string;
  type?: "hash" | "address" | "key";
  href?: string;
  className?: string;
  full?: boolean;
}

export function HashPlate({ value, type = "hash", href, className, full = false }: HashPlateProps) {
  const [copied, setCopied] = useState(false);

  const display = full
    ? value
    : type === "address"
    ? truncateAddress(value)
    : truncateHash(value);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono-gl text-[12px] text-[#9AA7B8]",
        "bg-[#070A12] border border-[#243044] rounded-[6px] px-2.5 py-1",
        className
      )}
    >
      <span className="truncate">{display}</span>
      <button
        onClick={handleCopy}
        className="text-[#64748B] hover:text-[#38BDF8] transition-colors flex-shrink-0"
        title="Copy"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#64748B] hover:text-[#38BDF8] transition-colors flex-shrink-0"
          title="View on explorer"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </span>
  );
}

interface CopyOnceSecretProps {
  value: string;
  label?: string;
}

export function CopyOnceSecret({ value, label = "API Key" }: CopyOnceSecretProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-[#9AA7B8]">{label}</p>
      <div className="flex items-center gap-2 bg-[#070A12] border border-[#38BDF8]/30 rounded-[8px] p-3">
        <code className="flex-1 font-mono-gl text-[12px] text-[#38BDF8] break-all">{value}</code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 text-[#64748B] hover:text-[#38BDF8] transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-xs text-[#EAB308]">
        Copy this key now. You will not be able to see it again.
      </p>
    </div>
  );
}
