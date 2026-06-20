import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function AuthAlert({ message, type = "error" }: { message: string; type?: "error" | "success" }) {
  const isError = type === "error";
  return (
    <div
      className={`flex items-start gap-2 p-3 rounded-[10px] text-sm ${
        isError
          ? "bg-[#2a0a0a] border border-[#EF4444]/30 text-[#EF4444]"
          : "bg-[#14261a] border border-[#22C55E]/30 text-[#22C55E]"
      }`}
    >
      {isError
        ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
      }
      <span className="capitalize">{message}</span>
    </div>
  );
}
