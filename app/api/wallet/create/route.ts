import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateWallet } from "@/lib/wallet/generate";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { org_id } = body;

    if (!org_id) {
      return NextResponse.json({ error: "org_id required" }, { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organisation_members")
      .select("organisation_id")
      .eq("organisation_id", org_id)
      .eq("user_id", user.id)
      .eq("role", "owner")
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Organisation not found" }, { status: 403 });
    }

    const result = await getOrCreateWallet(user.id, org_id);

    return NextResponse.json({
      wallet_address: result.wallet_address,
      created: result.created,
      recovery_hint: result.recovery_hint,
    });
  } catch (error) {
    console.error("[wallet/create]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
