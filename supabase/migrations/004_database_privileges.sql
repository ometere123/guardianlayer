-- Database privileges for PostgREST/Supabase API roles.
--
-- RLS policies decide which rows authenticated users can access, but the
-- PostgreSQL roles still need table privileges before those policies run.
-- Without these grants, Supabase returns errors such as:
--   permission denied for table organisations

grant usage on schema public to authenticated, service_role;

grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.has_org_role(uuid, text[]) to authenticated, service_role;
grant execute on function public.update_updated_at() to authenticated, service_role;

grant select, insert, update, delete on table
  public.user_profiles,
  public.organisations,
  public.organisation_members,
  public.wallets,
  public.protocols,
  public.monitored_contracts,
  public.pause_policies,
  public.api_keys,
  public.api_key_logs,
  public.signals,
  public.incidents,
  public.incident_signals,
  public.evidence_packets,
  public.genlayer_decisions,
  public.pause_actions,
  public.webhook_endpoints,
  public.webhook_deliveries,
  public.audit_logs,
  public.contract_activity_logs,
  public.invitations
to authenticated;

grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all routines in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant all privileges on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated;

alter default privileges in schema public
  grant all privileges on sequences to service_role;

alter default privileges in schema public
  grant execute on routines to authenticated;

alter default privileges in schema public
  grant all privileges on routines to service_role;
