-- ─────────────────────────────────────────────────────────
-- GUARDIAN LAYER - Initial Schema
-- Migration 001
-- ─────────────────────────────────────────────────────────

-- ── user_profiles ────────────────────────────────────────
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text not null,
  avatar_url text,
  default_organisation_id uuid,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- ── organisations ────────────────────────────────────────
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_user_id uuid not null references auth.users(id),
  owner_wallet_address text,
  plan text not null default 'starter',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organisations enable row level security;

-- ── organisation_members ─────────────────────────────────
create table public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','security_analyst','viewer')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organisation_id, user_id)
);

alter table public.organisation_members enable row level security;

-- ── RLS helper functions ──────────────────────────────────
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.organisation_members m
    where m.organisation_id = org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.organisation_members m
    where m.organisation_id = org_id
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles)
  );
$$;

-- Org policies
create policy "org members can read organisation"
  on public.organisations for select
  using (public.is_org_member(id));

create policy "owners can update organisation"
  on public.organisations for update
  using (public.has_org_role(id, array['owner']));

-- Member policies
create policy "org members can read members"
  on public.organisation_members for select
  using (public.is_org_member(organisation_id));

create policy "owners and admins can manage members"
  on public.organisation_members for all
  using (public.has_org_role(organisation_id, array['owner','admin']))
  with check (public.has_org_role(organisation_id, array['owner','admin']));

-- ── wallets ──────────────────────────────────────────────
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete cascade,
  wallet_address text not null,
  encrypted_private_key text not null,
  encryption_version text not null default 'v1',
  recovery_hint text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, wallet_address)
);

alter table public.wallets enable row level security;

-- Users can only see their own wallet record (address only - key never exposed via RLS)
create policy "users can read own wallet address"
  on public.wallets for select
  using (auth.uid() = user_id);

-- ── protocols ────────────────────────────────────────────
create table public.protocols (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  protocol_key text not null,
  name text not null,
  slug text not null,
  description text,
  category text not null default 'other',
  website_url text,
  docs_url text,
  github_url text,
  x_url text,
  discord_url text,
  chain text not null default 'genlayer',
  network text not null default 'studionet',
  owner_wallet_address text,
  emergency_mode text not null default 'alert_only'
    check (emergency_mode in ('alert_only','soft_pause','hard_pause')),
  current_status text not null default 'normal'
    check (current_status in ('normal','monitoring','under_review','pause_recommended','paused','disabled')),
  current_threat_level text not null default 'none'
    check (current_threat_level in ('none','low','elevated','high','critical')),
  current_recommended_action text not null default 'observe'
    check (current_recommended_action in ('observe','manual_review','soft_pause','hard_pause','disable_integration')),
  genlayer_protocol_registered boolean not null default false,
  genlayer_registration_tx_hash text,
  last_signal_at timestamptz,
  last_incident_at timestamptz,
  last_genlayer_decision_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, slug),
  unique (organisation_id, protocol_key)
);

alter table public.protocols enable row level security;

create policy "org members can read protocols"
  on public.protocols for select
  using (public.is_org_member(organisation_id));

create policy "owners and admins can manage protocols"
  on public.protocols for all
  using (public.has_org_role(organisation_id, array['owner','admin']))
  with check (public.has_org_role(organisation_id, array['owner','admin']));

-- ── monitored_contracts ───────────────────────────────────
create table public.monitored_contracts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  chain text not null,
  network text not null,
  address text not null,
  name text not null,
  role text not null default 'other',
  explorer_url text,
  is_pause_capable boolean not null default false,
  pause_function_name text,
  pause_function_signature text,
  is_active boolean not null default true,
  last_checked_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (protocol_id, chain, network, address)
);

alter table public.monitored_contracts enable row level security;

create policy "org members can read contracts"
  on public.monitored_contracts for select
  using (public.is_org_member(organisation_id));

create policy "owners and admins can manage contracts"
  on public.monitored_contracts for all
  using (public.has_org_role(organisation_id, array['owner','admin']))
  with check (public.has_org_role(organisation_id, array['owner','admin']));

-- ── pause_policies ────────────────────────────────────────
create table public.pause_policies (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  emergency_mode text not null default 'alert_only',
  minimum_threat_for_soft_pause text not null default 'high',
  minimum_threat_for_hard_pause text not null default 'critical',
  requires_explorer_evidence boolean not null default true,
  requires_multiple_sources_for_hard_pause boolean not null default true,
  human_approval_required_for_hard_pause boolean not null default true,
  incident_expiry_minutes int not null default 60,
  webhook_alerts_enabled boolean not null default true,
  hard_pause_enabled boolean not null default false,
  policy_hash text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (protocol_id)
);

alter table public.pause_policies enable row level security;

create policy "org members can read policies"
  on public.pause_policies for select
  using (public.is_org_member(organisation_id));

create policy "owners and admins can manage policies"
  on public.pause_policies for all
  using (public.has_org_role(organisation_id, array['owner','admin']))
  with check (public.has_org_role(organisation_id, array['owner','admin']));

-- ── api_keys ─────────────────────────────────────────────
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','revoked')),
  created_by uuid references auth.users(id),
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.api_keys enable row level security;

create policy "org members can read api key metadata"
  on public.api_keys for select
  using (public.is_org_member(organisation_id));

create policy "owners and admins can manage api keys"
  on public.api_keys for all
  using (public.has_org_role(organisation_id, array['owner','admin']))
  with check (public.has_org_role(organisation_id, array['owner','admin']));

-- ── api_key_logs ──────────────────────────────────────────
create table public.api_key_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete set null,
  endpoint text not null,
  method text not null,
  status_code int,
  ip_address_hash text,
  user_agent_hash text,
  request_id text,
  created_at timestamptz not null default now()
);

alter table public.api_key_logs enable row level security;

create policy "owners and admins can read api logs"
  on public.api_key_logs for select
  using (public.has_org_role(organisation_id, array['owner','admin']));

-- ── signals ───────────────────────────────────────────────
create table public.signals (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  source_type text not null,
  signal_type text not null,
  severity_hint text not null default 'low',
  title text not null,
  summary text not null,
  raw_payload_json jsonb,
  evidence_urls text[] not null default '{}',
  affected_contracts text[] not null default '{}',
  affected_wallets text[] not null default '{}',
  tx_hashes text[] not null default '{}',
  source_hash text,
  submitted_by_user_id uuid references auth.users(id),
  submitted_by_api_key_id uuid references public.api_keys(id),
  status text not null default 'new'
    check (status in ('new','triaged','incident_created','dismissed','duplicate','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.signals enable row level security;

create policy "org members can read signals"
  on public.signals for select
  using (public.is_org_member(organisation_id));

create policy "org members with write access can create signals"
  on public.signals for insert
  with check (public.has_org_role(organisation_id, array['owner','admin','security_analyst']));

create policy "owners and admins can update signals"
  on public.signals for update
  using (public.has_org_role(organisation_id, array['owner','admin','security_analyst']));

-- ── incidents ─────────────────────────────────────────────
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  incident_key text not null,
  title text not null,
  summary text not null,
  status text not null default 'open',
  threat_level text not null default 'none',
  recommended_action text not null default 'observe',
  confidence_label text not null default 'low',
  support_level text not null default 'none',
  source_count int not null default 0,
  evidence_hash text,
  genlayer_decision_id uuid,
  genlayer_tx_hash text,
  pause_execution_status text not null default 'not_applicable',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  expires_at timestamptz,
  unique (organisation_id, incident_key)
);

alter table public.incidents enable row level security;

create policy "org members can read incidents"
  on public.incidents for select
  using (public.is_org_member(organisation_id));

create policy "owners admins analysts can manage incidents"
  on public.incidents for all
  using (public.has_org_role(organisation_id, array['owner','admin','security_analyst']))
  with check (public.has_org_role(organisation_id, array['owner','admin','security_analyst']));

-- ── incident_signals ──────────────────────────────────────
create table public.incident_signals (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  signal_id uuid not null references public.signals(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (incident_id, signal_id)
);

alter table public.incident_signals enable row level security;

create policy "org members can read incident signals"
  on public.incident_signals for select
  using (
    exists (
      select 1 from public.incidents i
      where i.id = incident_id
        and public.is_org_member(i.organisation_id)
    )
  );

-- ── evidence_packets ─────────────────────────────────────
create table public.evidence_packets (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  packet_json jsonb not null,
  canonical_payload text not null,
  evidence_hash text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.evidence_packets enable row level security;

create policy "owners and admins can access evidence packets"
  on public.evidence_packets for all
  using (public.has_org_role(organisation_id, array['owner','admin']))
  with check (public.has_org_role(organisation_id, array['owner','admin']));

-- ── genlayer_decisions ────────────────────────────────────
create table public.genlayer_decisions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  contract_address text not null,
  tx_hash text,
  evidence_hash text not null,
  consensus_status text not null default 'pending',
  threat_level text,
  recommended_action text,
  confidence_label text,
  support_level text,
  affected_assets text[] not null default '{}',
  reasoning_summary text,
  human_review_reason text,
  raw_decision_json jsonb,
  explorer_url text,
  source_of_truth text not null default 'genlayer_contract',
  submitted_at timestamptz not null default now(),
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.genlayer_decisions enable row level security;

create policy "org members can read genlayer decisions"
  on public.genlayer_decisions for select
  using (public.is_org_member(organisation_id));

create policy "owners and admins can manage genlayer decisions"
  on public.genlayer_decisions for all
  using (public.has_org_role(organisation_id, array['owner','admin']))
  with check (public.has_org_role(organisation_id, array['owner','admin']));

-- ── pause_actions ─────────────────────────────────────────
create table public.pause_actions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  action_type text not null,
  status text not null default 'pending',
  execution_reference text,
  executed_by_user_id uuid references auth.users(id),
  executed_by_api_key_id uuid references public.api_keys(id),
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pause_actions enable row level security;

create policy "org members can read pause actions"
  on public.pause_actions for select
  using (public.is_org_member(organisation_id));

create policy "owners and admins can manage pause actions"
  on public.pause_actions for all
  using (public.has_org_role(organisation_id, array['owner','admin']))
  with check (public.has_org_role(organisation_id, array['owner','admin']));

-- ── webhook_endpoints ─────────────────────────────────────
create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  url text not null,
  secret text not null,
  events text[] not null default '{}',
  status text not null default 'active',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.webhook_endpoints enable row level security;

create policy "owners and admins can manage webhooks"
  on public.webhook_endpoints for all
  using (public.has_org_role(organisation_id, array['owner','admin']))
  with check (public.has_org_role(organisation_id, array['owner','admin']));

-- ── webhook_deliveries ────────────────────────────────────
create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  endpoint_id uuid references public.webhook_endpoints(id) on delete set null,
  event_type text not null,
  payload_json jsonb not null,
  status text not null default 'pending',
  response_code int,
  response_body text,
  attempt_count int not null default 0,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.webhook_deliveries enable row level security;

create policy "owners and admins can read webhook deliveries"
  on public.webhook_deliveries for select
  using (public.has_org_role(organisation_id, array['owner','admin']));

-- ── audit_logs ────────────────────────────────────────────
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  actor_api_key_id uuid references public.api_keys(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata_json jsonb,
  ip_address_hash text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "owners and admins can read audit logs"
  on public.audit_logs for select
  using (public.has_org_role(organisation_id, array['owner','admin']));

-- ── contract_activity_logs ────────────────────────────────
create table public.contract_activity_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  wallet_address text,
  protocol_id uuid references public.protocols(id),
  incident_id uuid references public.incidents(id),
  activity_type text not null,
  tx_hash text,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.contract_activity_logs enable row level security;

create policy "org members can read contract activity"
  on public.contract_activity_logs for select
  using (public.is_org_member(organisation_id));

-- ── Indexes ───────────────────────────────────────────────
create index idx_protocols_org on public.protocols(organisation_id);
create index idx_signals_org_protocol on public.signals(organisation_id, protocol_id);
create index idx_incidents_org_protocol on public.incidents(organisation_id, protocol_id);
create index idx_incidents_status on public.incidents(status);
create index idx_genlayer_decisions_incident on public.genlayer_decisions(incident_id);
create index idx_audit_logs_org on public.audit_logs(organisation_id, created_at desc);
create index idx_api_keys_hash on public.api_keys(key_hash);
create index idx_api_keys_prefix on public.api_keys(prefix);
create index idx_wallets_user on public.wallets(user_id);

-- ── Updated_at triggers ───────────────────────────────────
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.update_updated_at();

create trigger trg_organisations_updated_at
  before update on public.organisations
  for each row execute function public.update_updated_at();

create trigger trg_wallets_updated_at
  before update on public.wallets
  for each row execute function public.update_updated_at();

create trigger trg_protocols_updated_at
  before update on public.protocols
  for each row execute function public.update_updated_at();

create trigger trg_monitored_contracts_updated_at
  before update on public.monitored_contracts
  for each row execute function public.update_updated_at();

create trigger trg_pause_policies_updated_at
  before update on public.pause_policies
  for each row execute function public.update_updated_at();

create trigger trg_signals_updated_at
  before update on public.signals
  for each row execute function public.update_updated_at();

create trigger trg_incidents_updated_at
  before update on public.incidents
  for each row execute function public.update_updated_at();

create trigger trg_webhook_endpoints_updated_at
  before update on public.webhook_endpoints
  for each row execute function public.update_updated_at();
