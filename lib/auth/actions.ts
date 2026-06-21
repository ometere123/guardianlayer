"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit/write";
import { slugify } from "@/lib/utils";

export async function signUp(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const displayName = (formData.get("display_name") as string)?.trim();

  if (!email || !password || !displayName) {
    redirect("/signup?error=missing_fields");
  }
  if (password.length < 12) {
    redirect("/signup?error=password_too_short");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    console.error("[signUp]", error.message);
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    // Create user profile via service role
    const service = createAdminClient();
    await service.from("user_profiles").upsert({
      id: data.user.id,
      email,
      display_name: displayName,
      onboarding_completed: false,
    });
  }

  if (data.session) {
    redirect("/onboarding");
  }

  redirect("/verify-email");
}

export async function signIn(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=missing_fields");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Check if onboarding is complete
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed, default_organisation_id")
      .eq("id", user.id)
      .single();

    if (!profile?.onboarding_completed) {
      redirect("/onboarding");
    }
  }

  redirect("/app/overview");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=missing_email");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/reset-password`,
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/forgot-password?sent=1");
}

export async function resetPassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 12) {
    redirect("/reset-password?error=password_too_short");
  }
  if (password !== confirm) {
    redirect("/reset-password?error=passwords_do_not_match");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/app/overview?notice=password_updated");
}

export async function createOrganisation(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) redirect("/onboarding?error=missing_name");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const service = createAdminClient();

  // Check user doesn't already have an org
  const { data: existing } = await service
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (existing) {
    // Already has org - update profile and go to wallet setup
    await service
      .from("user_profiles")
      .update({ default_organisation_id: existing.organisation_id })
      .eq("id", user.id);
    redirect("/onboarding/wallet");
  }

  const slug = slugify(name);

  // Create org
  const { data: org, error: orgError } = await service
    .from("organisations")
    .insert({ name, slug, owner_user_id: user.id })
    .select("id")
    .single();

  if (orgError || !org) {
    redirect(`/onboarding?error=${encodeURIComponent(orgError?.message ?? "org_create_failed")}`);
  }

  // Add owner membership
  await service.from("organisation_members").insert({
    organisation_id: org.id,
    user_id: user.id,
    role: "owner",
  });

  // Update user profile
  await service.from("user_profiles").update({
    default_organisation_id: org.id,
  }).eq("id", user.id);

  // Audit
  await writeAuditLog(service, {
    organisation_id: org.id,
    actor_user_id: user.id,
    action: "organisation.created",
    target_type: "organisation",
    target_id: org.id,
    metadata_json: { name, slug },
  });

  redirect("/onboarding/wallet");
}

export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createAdminClient();
  const { data: membership } = await service
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (!membership?.organisation_id) redirect("/onboarding");

  const { data: wallet } = await service
    .from("wallets")
    .select("id")
    .eq("user_id", user.id)
    .eq("organisation_id", membership.organisation_id)
    .eq("is_primary", true)
    .maybeSingle();

  if (!wallet) redirect("/onboarding/wallet");

  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : (user.email ?? "").split("@")[0];

  const { error } = await service.from("user_profiles").upsert({
    id: user.id,
    email: user.email ?? "",
    display_name: displayName,
    default_organisation_id: membership.organisation_id,
    onboarding_completed: true,
  }, { onConflict: "id" });

  if (error) {
    redirect(`/onboarding/wallet?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/app/overview");
}
