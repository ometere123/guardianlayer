// Adds Relationships field required by @supabase/supabase-js v2 GenericTable + GenericSchema constraints
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WithRelationships<T> = { [K in keyof T]: T[K] & { Relationships: any[] } };

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: WithRelationships<{
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          email: string;
          avatar_url: string | null;
          default_organisation_id: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          email: string;
          avatar_url?: string | null;
          default_organisation_id?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          email?: string;
          avatar_url?: string | null;
          default_organisation_id?: string | null;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
      };
      organisations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_user_id: string;
          owner_wallet_address: string | null;
          plan: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_user_id: string;
          owner_wallet_address?: string | null;
          plan?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          owner_wallet_address?: string | null;
          plan?: string;
          status?: string;
          updated_at?: string;
        };
      };
      organisation_members: {
        Row: {
          id: string;
          organisation_id: string;
          user_id: string;
          role: "owner" | "admin" | "security_analyst" | "viewer";
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          user_id: string;
          role: "owner" | "admin" | "security_analyst" | "viewer";
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          role?: "owner" | "admin" | "security_analyst" | "viewer";
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          organisation_id: string | null;
          wallet_address: string;
          encrypted_private_key: string;
          encryption_version: string;
          recovery_hint: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organisation_id?: string | null;
          wallet_address: string;
          encrypted_private_key: string;
          encryption_version?: string;
          recovery_hint?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          encrypted_private_key?: string;
          encryption_version?: string;
          recovery_hint?: string | null;
          organisation_id?: string | null;
          updated_at?: string;
        };
      };
      monitored_contracts: {
        Row: {
          id: string;
          organisation_id: string;
          protocol_id: string;
          chain: string;
          network: string;
          address: string;
          name: string;
          role: string;
          explorer_url: string | null;
          is_pause_capable: boolean;
          pause_function_name: string | null;
          pause_function_signature: string | null;
          is_active: boolean;
          last_checked_at: string | null;
          last_activity_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          protocol_id: string;
          chain: string;
          network: string;
          address: string;
          name: string;
          role?: string;
          explorer_url?: string | null;
          is_pause_capable?: boolean;
          pause_function_name?: string | null;
          pause_function_signature?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          role?: string;
          explorer_url?: string | null;
          is_pause_capable?: boolean;
          pause_function_name?: string | null;
          pause_function_signature?: string | null;
          is_active?: boolean;
          last_checked_at?: string | null;
          last_activity_at?: string | null;
          updated_at?: string;
        };
      };
      pause_policies: {
        Row: {
          id: string;
          organisation_id: string;
          protocol_id: string;
          emergency_mode: string;
          minimum_threat_for_soft_pause: string;
          minimum_threat_for_hard_pause: string;
          requires_explorer_evidence: boolean;
          requires_multiple_sources_for_hard_pause: boolean;
          human_approval_required_for_hard_pause: boolean;
          incident_expiry_minutes: number;
          webhook_alerts_enabled: boolean;
          hard_pause_enabled: boolean;
          policy_hash: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          protocol_id: string;
          emergency_mode?: string;
          minimum_threat_for_soft_pause?: string;
          minimum_threat_for_hard_pause?: string;
          requires_explorer_evidence?: boolean;
          requires_multiple_sources_for_hard_pause?: boolean;
          human_approval_required_for_hard_pause?: boolean;
          incident_expiry_minutes?: number;
          webhook_alerts_enabled?: boolean;
          hard_pause_enabled?: boolean;
          policy_hash?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          emergency_mode?: string;
          minimum_threat_for_soft_pause?: string;
          minimum_threat_for_hard_pause?: string;
          requires_explorer_evidence?: boolean;
          requires_multiple_sources_for_hard_pause?: boolean;
          human_approval_required_for_hard_pause?: boolean;
          incident_expiry_minutes?: number;
          webhook_alerts_enabled?: boolean;
          hard_pause_enabled?: boolean;
          policy_hash?: string | null;
          updated_at?: string;
        };
      };
      protocols: {
        Row: {
          id: string;
          organisation_id: string;
          protocol_key: string;
          name: string;
          slug: string;
          description: string | null;
          category: string;
          website_url: string | null;
          docs_url: string | null;
          github_url: string | null;
          x_url: string | null;
          discord_url: string | null;
          chain: string;
          network: string;
          owner_wallet_address: string | null;
          emergency_mode: string;
          current_status: string;
          current_threat_level: string;
          current_recommended_action: string;
          genlayer_protocol_registered: boolean;
          genlayer_registration_tx_hash: string | null;
          last_signal_at: string | null;
          last_incident_at: string | null;
          last_genlayer_decision_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          protocol_key: string;
          name: string;
          slug: string;
          description?: string | null;
          category?: string;
          website_url?: string | null;
          docs_url?: string | null;
          github_url?: string | null;
          x_url?: string | null;
          discord_url?: string | null;
          chain?: string;
          network?: string;
          owner_wallet_address?: string | null;
          emergency_mode?: string;
          current_status?: string;
          current_threat_level?: string;
          current_recommended_action?: string;
          genlayer_protocol_registered?: boolean;
          genlayer_registration_tx_hash?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          category?: string;
          website_url?: string | null;
          docs_url?: string | null;
          github_url?: string | null;
          x_url?: string | null;
          discord_url?: string | null;
          emergency_mode?: string;
          current_status?: string;
          current_threat_level?: string;
          current_recommended_action?: string;
          genlayer_protocol_registered?: boolean;
          genlayer_registration_tx_hash?: string | null;
          last_signal_at?: string | null;
          last_incident_at?: string | null;
          last_genlayer_decision_at?: string | null;
          updated_at?: string;
        };
      };
      signals: {
        Row: {
          id: string;
          organisation_id: string;
          protocol_id: string;
          source_type: string;
          signal_type: string;
          severity_hint: string;
          title: string;
          summary: string;
          raw_payload_json: Json | null;
          evidence_urls: string[];
          affected_contracts: string[];
          affected_wallets: string[];
          tx_hashes: string[];
          source_hash: string | null;
          submitted_by_user_id: string | null;
          submitted_by_api_key_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          protocol_id: string;
          source_type: string;
          signal_type: string;
          severity_hint?: string;
          title: string;
          summary: string;
          raw_payload_json?: Json | null;
          evidence_urls?: string[];
          affected_contracts?: string[];
          affected_wallets?: string[];
          tx_hashes?: string[];
          source_hash?: string | null;
          submitted_by_user_id?: string | null;
          submitted_by_api_key_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          updated_at?: string;
        };
      };
      incidents: {
        Row: {
          id: string;
          organisation_id: string;
          protocol_id: string;
          incident_key: string;
          title: string;
          summary: string;
          status: string;
          threat_level: string;
          recommended_action: string;
          confidence_label: string;
          support_level: string;
          source_count: number;
          evidence_hash: string | null;
          genlayer_decision_id: string | null;
          genlayer_tx_hash: string | null;
          pause_execution_status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          protocol_id: string;
          incident_key: string;
          title: string;
          summary: string;
          status?: string;
          threat_level?: string;
          recommended_action?: string;
          confidence_label?: string;
          support_level?: string;
          source_count?: number;
          evidence_hash?: string | null;
          genlayer_decision_id?: string | null;
          genlayer_tx_hash?: string | null;
          pause_execution_status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          status?: string;
          threat_level?: string;
          recommended_action?: string;
          confidence_label?: string;
          support_level?: string;
          evidence_hash?: string | null;
          genlayer_decision_id?: string | null;
          genlayer_tx_hash?: string | null;
          pause_execution_status?: string;
          updated_at?: string;
          resolved_at?: string | null;
          expires_at?: string | null;
        };
      };
      incident_signals: {
        Row: {
          id: string;
          incident_id: string;
          signal_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          incident_id: string;
          signal_id: string;
          created_at?: string;
        };
        Update: never;
      };
      evidence_packets: {
        Row: {
          id: string;
          organisation_id: string;
          protocol_id: string;
          incident_id: string;
          packet_json: Json;
          canonical_payload: string;
          evidence_hash: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          protocol_id: string;
          incident_id: string;
          packet_json: Json;
          canonical_payload: string;
          evidence_hash: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      api_keys: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          prefix: string;
          key_hash: string;
          scopes: string[];
          status: string;
          created_by: string | null;
          last_used_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          prefix: string;
          key_hash: string;
          scopes?: string[];
          status?: string;
          created_by?: string | null;
          last_used_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
      };
      api_key_logs: {
        Row: {
          id: string;
          organisation_id: string;
          api_key_id: string | null;
          endpoint: string;
          method: string;
          status_code: number | null;
          ip_address_hash: string | null;
          user_agent_hash: string | null;
          request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          api_key_id?: string | null;
          endpoint: string;
          method: string;
          status_code?: number | null;
          ip_address_hash?: string | null;
          user_agent_hash?: string | null;
          request_id?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      genlayer_decisions: {
        Row: {
          id: string;
          organisation_id: string;
          protocol_id: string;
          incident_id: string;
          contract_address: string;
          tx_hash: string | null;
          evidence_hash: string;
          consensus_status: string;
          threat_level: string | null;
          recommended_action: string | null;
          confidence_label: string | null;
          support_level: string | null;
          affected_assets: string[];
          reasoning_summary: string | null;
          human_review_reason: string | null;
          raw_decision_json: Json | null;
          explorer_url: string | null;
          source_of_truth: string;
          submitted_at: string;
          finalized_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          protocol_id: string;
          incident_id: string;
          contract_address: string;
          tx_hash?: string | null;
          evidence_hash: string;
          consensus_status?: string;
          threat_level?: string | null;
          recommended_action?: string | null;
          confidence_label?: string | null;
          support_level?: string | null;
          affected_assets?: string[];
          reasoning_summary?: string | null;
          human_review_reason?: string | null;
          raw_decision_json?: Json | null;
          explorer_url?: string | null;
          source_of_truth?: string;
          submitted_at?: string;
          finalized_at?: string | null;
          created_at?: string;
        };
        Update: {
          tx_hash?: string | null;
          consensus_status?: string;
          threat_level?: string | null;
          recommended_action?: string | null;
          confidence_label?: string | null;
          support_level?: string | null;
          affected_assets?: string[];
          reasoning_summary?: string | null;
          human_review_reason?: string | null;
          raw_decision_json?: Json | null;
          explorer_url?: string | null;
          source_of_truth?: string;
          finalized_at?: string | null;
        };
      };
      invitations: {
        Row: {
          id: string;
          organisation_id: string;
          invited_by: string;
          email: string;
          role: "admin" | "security_analyst" | "viewer";
          token: string;
          status: "pending" | "accepted" | "revoked" | "expired";
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          invited_by: string;
          email: string;
          role: "admin" | "security_analyst" | "viewer";
          token?: string;
          status?: "pending" | "accepted" | "revoked" | "expired";
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "pending" | "accepted" | "revoked" | "expired";
          accepted_at?: string | null;
        };
      };
      webhook_deliveries: {
        Row: {
          id: string;
          organisation_id: string;
          endpoint_id: string | null;
          event_type: string;
          payload_json: Json;
          status: string;
          response_code: number | null;
          response_body: string | null;
          attempt_count: number;
          next_retry_at: string | null;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          endpoint_id?: string | null;
          event_type: string;
          payload_json: Json;
          status?: string;
          response_code?: number | null;
          response_body?: string | null;
          attempt_count?: number;
          next_retry_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          response_code?: number | null;
          response_body?: string | null;
          attempt_count?: number;
          next_retry_at?: string | null;
          delivered_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          organisation_id: string | null;
          actor_user_id: string | null;
          actor_api_key_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata_json: Json | null;
          ip_address_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organisation_id?: string | null;
          actor_user_id?: string | null;
          actor_api_key_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata_json?: Json | null;
          ip_address_hash?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      webhook_endpoints: {
        Row: {
          id: string;
          organisation_id: string;
          name: string;
          url: string;
          secret: string;
          events: string[];
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          name: string;
          url: string;
          secret: string;
          events?: string[];
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          url?: string;
          events?: string[];
          status?: string;
          updated_at?: string;
        };
      };
    }>;
    Views: Record<string, never>;
    Functions: {
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      has_org_role: {
        Args: { org_id: string; allowed_roles: string[] };
        Returns: boolean;
      };
    };
  };
};
