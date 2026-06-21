"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function ResetPasswordHandler() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const hash = window.location.hash;
      if (!hash || !hash.includes("access_token")) {
        if (!cancelled) setStatus("error");
        return;
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const params = new URLSearchParams(hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken) {
        if (!cancelled) setStatus("error");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken ?? "",
      });

      if (cancelled) return;

      if (error) {
        console.error("[reset] Session error:", error);
        setStatus("error");
      } else {
        setStatus("ready");
        window.history.replaceState(null, "", window.location.pathname);
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="px-4 py-3 rounded-[10px] bg-[#121827] border border-[#243044] text-sm text-[#9AA7B8]">
        Verifying reset link…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="px-4 py-3 rounded-[10px] bg-[#2a0a0a] border border-[#EF4444]/20 text-sm text-[#EF4444]">
        Auth Session Missing! The reset link may have expired. <a href="/forgot-password" className="underline">Request a new one.</a>
      </div>
    );
  }

  return null;
}
