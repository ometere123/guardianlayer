-- Stage: Team Invites
-- Run in Supabase SQL editor

create table if not exists public.invitations (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  invited_by       uuid not null references auth.users(id),
  email            text not null,
  role             text not null check (role in ('admin','security_analyst','viewer')),
  token            text not null unique default encode(gen_random_bytes(32), 'hex'),
  status           text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at       timestamptz not null default now() + interval '7 days',
  accepted_at      timestamptz,
  created_at       timestamptz not null default now()
);

alter table public.invitations enable row level security;

create policy "org admins can manage invitations"
  on public.invitations for all
  using (public.has_org_role(organisation_id, array['owner','admin']));

create index if not exists invitations_org_idx    on public.invitations(organisation_id, created_at desc);
create index if not exists invitations_email_idx  on public.invitations(email);
create index if not exists invitations_token_idx  on public.invitations(token);
