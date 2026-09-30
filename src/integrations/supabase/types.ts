export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          active: boolean
          code: string
          criteria: Json
          description: string
          icon: string
          name: string
          quest_reward: number
          sort_order: number
          tier: string
        }
        Insert: {
          active?: boolean
          code: string
          criteria?: Json
          description?: string
          icon?: string
          name: string
          quest_reward?: number
          sort_order?: number
          tier?: string
        }
        Update: {
          active?: boolean
          code?: string
          criteria?: Json
          description?: string
          icon?: string
          name?: string
          quest_reward?: number
          sort_order?: number
          tier?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          id: string
          reason: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          active: boolean
          budget: number | null
          code: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          name: string
          spent: number
          starts_at: string | null
        }
        Insert: {
          active?: boolean
          budget?: number | null
          code: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          name: string
          spent?: number
          starts_at?: string | null
        }
        Update: {
          active?: boolean
          budget?: number | null
          code?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          name?: string
          spent?: number
          starts_at?: string | null
        }
        Relationships: []
      }
      collection_images: {
        Row: {
          alt: string | null
          attribution: string | null
          caption: string | null
          cleared: boolean
          creator: string | null
          description: string | null
          image_date: string | null
          image_key: string
          image_url: string | null
          import_hash: string | null
          kind: string | null
          license: string | null
          marker_id: string
          notes: string | null
          position: number
          record_url: string | null
          reuse_status: string | null
          rights_holder: string | null
          title: string | null
        }
        Insert: {
          alt?: string | null
          attribution?: string | null
          caption?: string | null
          cleared?: boolean
          creator?: string | null
          description?: string | null
          image_date?: string | null
          image_key: string
          image_url?: string | null
          import_hash?: string | null
          kind?: string | null
          license?: string | null
          marker_id: string
          notes?: string | null
          position?: number
          record_url?: string | null
          reuse_status?: string | null
          rights_holder?: string | null
          title?: string | null
        }
        Update: {
          alt?: string | null
          attribution?: string | null
          caption?: string | null
          cleared?: boolean
          creator?: string | null
          description?: string | null
          image_date?: string | null
          image_key?: string
          image_url?: string | null
          import_hash?: string | null
          kind?: string | null
          license?: string | null
          marker_id?: string
          notes?: string | null
          position?: number
          record_url?: string | null
          reuse_status?: string | null
          rights_holder?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_images_marker_id_fkey"
            columns: ["marker_id"]
            isOneToOne: false
            referencedRelation: "collection_markers"
            referencedColumns: ["marker_id"]
          },
        ]
      }
      collection_markers: {
        Row: {
          access_notes: string | null
          address: string | null
          category: string | null
          city_id: string | null
          city_name: string | null
          collection_code: string
          community: string | null
          coord_precision: string | null
          coord_withheld: boolean
          county: string | null
          created_at: string
          draft_settings: Json
          featured_article: string | null
          history_focus: string | null
          import_hash: string | null
          lat: number | null
          lng: number | null
          location_relationship: string | null
          marker_id: string
          marker_type: string | null
          narrative_kind: string
          period: string | null
          plaque_status: string | null
          region: string | null
          region_label: string | null
          review_status: string | null
          sensitive: boolean
          status: string
          story: string | null
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          visitor_connection: string | null
          why_it_matters: string | null
        }
        Insert: {
          access_notes?: string | null
          address?: string | null
          category?: string | null
          city_id?: string | null
          city_name?: string | null
          collection_code: string
          community?: string | null
          coord_precision?: string | null
          coord_withheld?: boolean
          county?: string | null
          created_at?: string
          draft_settings?: Json
          featured_article?: string | null
          history_focus?: string | null
          import_hash?: string | null
          lat?: number | null
          lng?: number | null
          location_relationship?: string | null
          marker_id: string
          marker_type?: string | null
          narrative_kind?: string
          period?: string | null
          plaque_status?: string | null
          region?: string | null
          region_label?: string | null
          review_status?: string | null
          sensitive?: boolean
          status?: string
          story?: string | null
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          visitor_connection?: string | null
          why_it_matters?: string | null
        }
        Update: {
          access_notes?: string | null
          address?: string | null
          category?: string | null
          city_id?: string | null
          city_name?: string | null
          collection_code?: string
          community?: string | null
          coord_precision?: string | null
          coord_withheld?: boolean
          county?: string | null
          created_at?: string
          draft_settings?: Json
          featured_article?: string | null
          history_focus?: string | null
          import_hash?: string | null
          lat?: number | null
          lng?: number | null
          location_relationship?: string | null
          marker_id?: string
          marker_type?: string | null
          narrative_kind?: string
          period?: string | null
          plaque_status?: string | null
          region?: string | null
          region_label?: string | null
          review_status?: string | null
          sensitive?: boolean
          status?: string
          story?: string | null
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          visitor_connection?: string | null
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_markers_collection_code_fkey"
            columns: ["collection_code"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["code"]
          },
        ]
      }
      collection_sources: {
        Row: {
          access_date: string | null
          archival_ref: string | null
          author: string | null
          checked: boolean
          import_hash: string | null
          marker_id: string
          position: number
          pub_date: string | null
          publisher: string | null
          source_key: string
          source_type: string | null
          supports: string | null
          title: string
          url: string | null
        }
        Insert: {
          access_date?: string | null
          archival_ref?: string | null
          author?: string | null
          checked?: boolean
          import_hash?: string | null
          marker_id: string
          position?: number
          pub_date?: string | null
          publisher?: string | null
          source_key: string
          source_type?: string | null
          supports?: string | null
          title: string
          url?: string | null
        }
        Update: {
          access_date?: string | null
          archival_ref?: string | null
          author?: string | null
          checked?: boolean
          import_hash?: string | null
          marker_id?: string
          position?: number
          pub_date?: string | null
          publisher?: string | null
          source_key?: string
          source_type?: string | null
          supports?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_sources_marker_id_fkey"
            columns: ["marker_id"]
            isOneToOne: false
            referencedRelation: "collection_markers"
            referencedColumns: ["marker_id"]
          },
        ]
      }
      collections: {
        Row: {
          code: string
          featured: Json
          regions: Json
          report_notes: Json
          status: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          featured?: Json
          regions?: Json
          report_notes?: Json
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          featured?: Json
          regions?: Json
          report_notes?: Json
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      discovery_claims: {
        Row: {
          claimed_at: string | null
          expires_at: string | null
          guest_secret: string | null
          id: string
          marker_slug: string
          method: string
          status: string
          user_id: string | null
          verified_at: string
        }
        Insert: {
          claimed_at?: string | null
          expires_at?: string | null
          guest_secret?: string | null
          id?: string
          marker_slug: string
          method: string
          status?: string
          user_id?: string | null
          verified_at?: string
        }
        Update: {
          claimed_at?: string | null
          expires_at?: string | null
          guest_secret?: string | null
          id?: string
          marker_slug?: string
          method?: string
          status?: string
          user_id?: string | null
          verified_at?: string
        }
        Relationships: []
      }
      discovery_content: {
        Row: {
          audio_path: string | null
          bonus_story: string | null
          campaign_code: string | null
          created_by: string | null
          enabled: boolean
          gallery: Json
          marker_slug: string
          reflection_prompt: string | null
          reward_badge_code: string | null
          reward_kind: string
          reward_quest: number
          reward_scope: string
          updated_at: string
        }
        Insert: {
          audio_path?: string | null
          bonus_story?: string | null
          campaign_code?: string | null
          created_by?: string | null
          enabled?: boolean
          gallery?: Json
          marker_slug: string
          reflection_prompt?: string | null
          reward_badge_code?: string | null
          reward_kind?: string
          reward_quest?: number
          reward_scope?: string
          updated_at?: string
        }
        Update: {
          audio_path?: string | null
          bonus_story?: string | null
          campaign_code?: string | null
          created_by?: string | null
          enabled?: boolean
          gallery?: Json
          marker_slug?: string
          reflection_prompt?: string | null
          reward_badge_code?: string | null
          reward_kind?: string
          reward_quest?: number
          reward_scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      discovery_prerequisites: {
        Row: {
          marker_slug: string
          requires_id: string
          requires_type: string
        }
        Insert: {
          marker_slug: string
          requires_id: string
          requires_type: string
        }
        Update: {
          marker_slug?: string
          requires_id?: string
          requires_type?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          created_at: string
          equipped: boolean
          id: string
          redemption_id: string | null
          revoked_at: string | null
          reward_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equipped?: boolean
          id?: string
          redemption_id?: string | null
          revoked_at?: string | null
          reward_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          equipped?: boolean
          id?: string
          redemption_id?: string | null
          revoked_at?: string | null
          reward_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_reward_code_fkey"
            columns: ["reward_code"]
            isOneToOne: false
            referencedRelation: "rewards_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      explorer_balances: {
        Row: {
          balance: number
          lifetime_earned: number
          lifetime_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      h5p_activities: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          library: string | null
          marker_slug: string
          min_seconds: number
          position: number
          published: boolean
          reward_amount: number
          storage_prefix: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          library?: string | null
          marker_slug: string
          min_seconds?: number
          position?: number
          published?: boolean
          reward_amount?: number
          storage_prefix: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          library?: string | null
          marker_slug?: string
          min_seconds?: number
          position?: number
          published?: boolean
          reward_amount?: number
          storage_prefix?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      h5p_attempts: {
        Row: {
          activity_id: string
          completed_at: string | null
          expires_at: string
          id: string
          raw_result: Json | null
          started_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          completed_at?: string | null
          expires_at?: string
          id?: string
          raw_result?: Json | null
          started_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          completed_at?: string | null
          expires_at?: string
          id?: string
          raw_result?: Json | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "h5p_attempts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "h5p_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      import_issues: {
        Row: {
          collection_code: string | null
          created_at: string
          details: Json
          issue_key: string
          kind: string
          marker_id: string | null
          message: string
          resolved: boolean
          run_id: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          collection_code?: string | null
          created_at?: string
          details?: Json
          issue_key: string
          kind: string
          marker_id?: string | null
          message: string
          resolved?: boolean
          run_id?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          collection_code?: string | null
          created_at?: string
          details?: Json
          issue_key?: string
          kind?: string
          marker_id?: string | null
          message?: string
          resolved?: boolean
          run_id?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_issues_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          collection_code: string | null
          created_at: string
          created_by: string | null
          files: Json
          id: string
          summary: Json
        }
        Insert: {
          collection_code?: string | null
          created_at?: string
          created_by?: string | null
          files?: Json
          id?: string
          summary?: Json
        }
        Update: {
          collection_code?: string | null
          created_at?: string
          created_by?: string | null
          files?: Json
          id?: string
          summary?: Json
        }
        Relationships: []
      }
      marker_requests: {
        Row: {
          address: string | null
          created_at: string
          id: string
          location_name: string
          reviewed_at: string | null
          status: string
          submitted_by: string | null
          submitter_email: string | null
          why_it_matters: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          location_name: string
          reviewed_at?: string | null
          status?: string
          submitted_by?: string | null
          submitter_email?: string | null
          why_it_matters: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          location_name?: string
          reviewed_at?: string | null
          status?: string
          submitted_by?: string | null
          submitter_email?: string | null
          why_it_matters?: string
        }
        Relationships: []
      }
      marker_trivia: {
        Row: {
          created_at: string
          id: string
          marker_id: string
          questions: Json
        }
        Insert: {
          created_at?: string
          id?: string
          marker_id: string
          questions?: Json
        }
        Update: {
          created_at?: string
          id?: string
          marker_id?: string
          questions?: Json
        }
        Relationships: []
      }
      marker_visits: {
        Row: {
          id: string
          marker_id: string
          user_id: string
          visited_at: string
        }
        Insert: {
          id?: string
          marker_id: string
          user_id: string
          visited_at?: string
        }
        Update: {
          id?: string
          marker_id?: string
          user_id?: string
          visited_at?: string
        }
        Relationships: []
      }
      markers: {
        Row: {
          address: string
          arrival_radius_m: number
          artifact_attribution: string | null
          artifact_model_url: string | null
          artifact_name: string | null
          availability_tz: string
          available_from: string | null
          available_until: string | null
          category: string
          city: string
          clue: string | null
          created_at: string
          created_by: string | null
          discovery_visibility: string
          id: string
          image_path: string | null
          lat: number
          lng: number
          marker_type: string
          name: string
          published: boolean
          rarity: string
          reveal_style: string
          review_status: string
          sensitivity: string
          slug: string
          sources: Json
          state: string | null
          story: string
          street_view: Json | null
          summary: string
          updated_at: string
        }
        Insert: {
          address?: string
          arrival_radius_m?: number
          artifact_attribution?: string | null
          artifact_model_url?: string | null
          artifact_name?: string | null
          availability_tz?: string
          available_from?: string | null
          available_until?: string | null
          category?: string
          city?: string
          clue?: string | null
          created_at?: string
          created_by?: string | null
          discovery_visibility?: string
          id?: string
          image_path?: string | null
          lat: number
          lng: number
          marker_type?: string
          name: string
          published?: boolean
          rarity?: string
          reveal_style?: string
          review_status?: string
          sensitivity?: string
          slug: string
          sources?: Json
          state?: string | null
          story?: string
          street_view?: Json | null
          summary?: string
          updated_at?: string
        }
        Update: {
          address?: string
          arrival_radius_m?: number
          artifact_attribution?: string | null
          artifact_model_url?: string | null
          artifact_name?: string | null
          availability_tz?: string
          available_from?: string | null
          available_until?: string | null
          category?: string
          city?: string
          clue?: string | null
          created_at?: string
          created_by?: string | null
          discovery_visibility?: string
          id?: string
          image_path?: string | null
          lat?: number
          lng?: number
          marker_type?: string
          name?: string
          published?: boolean
          rarity?: string
          reveal_style?: string
          review_status?: string
          sensitivity?: string
          slug?: string
          sources?: Json
          state?: string | null
          story?: string
          street_view?: Json | null
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_codes: {
        Row: {
          assigned_to: string | null
          code: string
          created_at: string
          id: string
          redeemed_at: string | null
          redeemed_by: string | null
          redemption_id: string | null
          reward_code: string
          status: string
        }
        Insert: {
          assigned_to?: string | null
          code: string
          created_at?: string
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          redemption_id?: string | null
          reward_code: string
          status?: string
        }
        Update: {
          assigned_to?: string | null
          code?: string
          created_at?: string
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          redemption_id?: string | null
          reward_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_codes_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_codes_reward_code_fkey"
            columns: ["reward_code"]
            isOneToOne: false
            referencedRelation: "rewards_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      postcard_sets: {
        Row: {
          city: string | null
          code: string
          created_at: string
          created_by: string | null
          name: string
          trail_id: string | null
        }
        Insert: {
          city?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          name: string
          trail_id?: string | null
        }
        Update: {
          city?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          name?: string
          trail_id?: string | null
        }
        Relationships: []
      }
      postcards: {
        Row: {
          back_text: string
          commemorative: boolean
          created_at: string
          created_by: string | null
          credits: string
          front_alt: string
          front_path: string | null
          id: string
          location: string
          marker_slug: string
          secret_title: boolean
          set_code: string | null
          sources: Json
          title: string
          updated_at: string
        }
        Insert: {
          back_text?: string
          commemorative?: boolean
          created_at?: string
          created_by?: string | null
          credits?: string
          front_alt?: string
          front_path?: string | null
          id?: string
          location?: string
          marker_slug: string
          secret_title?: boolean
          set_code?: string | null
          sources?: Json
          title: string
          updated_at?: string
        }
        Update: {
          back_text?: string
          commemorative?: boolean
          created_at?: string
          created_by?: string | null
          credits?: string
          front_alt?: string
          front_path?: string | null
          id?: string
          location?: string
          marker_slug?: string
          secret_title?: boolean
          set_code?: string | null
          sources?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "postcards_set_code_fkey"
            columns: ["set_code"]
            isOneToOne: false
            referencedRelation: "postcard_sets"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          ads_opt_in: boolean
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          email_opt_in: boolean
          id: string
          notifications_opt_in: boolean
          onboarded_at: string | null
          share_code: string | null
          share_enabled: boolean
        }
        Insert: {
          ads_opt_in?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_opt_in?: boolean
          id: string
          notifications_opt_in?: boolean
          onboarded_at?: string | null
          share_code?: string | null
          share_enabled?: boolean
        }
        Update: {
          ads_opt_in?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_opt_in?: boolean
          id?: string
          notifications_opt_in?: boolean
          onboarded_at?: string | null
          share_code?: string | null
          share_enabled?: boolean
        }
        Relationships: []
      }
      quest_completions: {
        Row: {
          completed_at: string
          completion_type: string
          id: string
          max_score: number
          score: number
          target_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completion_type: string
          id?: string
          max_score?: number
          score?: number
          target_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          completion_type?: string
          id?: string
          max_score?: number
          score?: number
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      quest_events: {
        Row: {
          amount: number | null
          campaign_code: string | null
          checkin_secret: string
          code: string
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          id: string
          location: string | null
          name: string
          published: boolean
          rotate_seconds: number
          starts_at: string | null
          timezone: string
          verification: string
        }
        Insert: {
          amount?: number | null
          campaign_code?: string | null
          checkin_secret?: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          name: string
          published?: boolean
          rotate_seconds?: number
          starts_at?: string | null
          timezone?: string
          verification?: string
        }
        Update: {
          amount?: number | null
          campaign_code?: string | null
          checkin_secret?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          name?: string
          published?: boolean
          rotate_seconds?: number
          starts_at?: string | null
          timezone?: string
          verification?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_events_campaign_code_fkey"
            columns: ["campaign_code"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["code"]
          },
        ]
      }
      redemptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          idempotency_key: string | null
          quest_spent: number
          redeemed_at: string | null
          redemption_code: string | null
          refund_reason: string | null
          refunded_at: string | null
          reward_code: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          quest_spent: number
          redeemed_at?: string | null
          redemption_code?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          reward_code: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          quest_spent?: number
          redeemed_at?: string | null
          redemption_code?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          reward_code?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_reward_code_fkey"
            columns: ["reward_code"]
            isOneToOne: false
            referencedRelation: "rewards_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      review_flags: {
        Row: {
          created_at: string
          details: Json
          id: string
          kind: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          kind: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          kind?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_events: {
        Row: {
          award_key: string | null
          chain_id: string | null
          chain_tx_hash: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          quest_amount: number
          reverses_event_id: string | null
          settled_at: string | null
          settlement_status: string
          source_id: string | null
          source_type: string | null
          status: string
          title: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          award_key?: string | null
          chain_id?: string | null
          chain_tx_hash?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          quest_amount: number
          reverses_event_id?: string | null
          settled_at?: string | null
          settlement_status?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          award_key?: string | null
          chain_id?: string | null
          chain_tx_hash?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          quest_amount?: number
          reverses_event_id?: string | null
          settled_at?: string | null
          settlement_status?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_events_reverses_event_id_fkey"
            columns: ["reverses_event_id"]
            isOneToOne: false
            referencedRelation: "reward_events"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_rules: {
        Row: {
          active: boolean
          amount: number
          cap_per_user: number | null
          code: string
          cooldown_hours: number
          description: string
          ends_at: string | null
          name: string
          repeatable: boolean
          sort_order: number
          stacks_with_trail: boolean
          starts_at: string | null
          timezone: string
          updated_at: string
          verification: string
        }
        Insert: {
          active?: boolean
          amount?: number
          cap_per_user?: number | null
          code: string
          cooldown_hours?: number
          description?: string
          ends_at?: string | null
          name: string
          repeatable?: boolean
          sort_order?: number
          stacks_with_trail?: boolean
          starts_at?: string | null
          timezone?: string
          updated_at?: string
          verification?: string
        }
        Update: {
          active?: boolean
          amount?: number
          cap_per_user?: number | null
          code?: string
          cooldown_hours?: number
          description?: string
          ends_at?: string | null
          name?: string
          repeatable?: boolean
          sort_order?: number
          stacks_with_trail?: boolean
          starts_at?: string | null
          timezone?: string
          updated_at?: string
          verification?: string
        }
        Relationships: []
      }
      rewards_catalog: {
        Row: {
          active: boolean
          code: string
          code_expires_days: number | null
          cost: number
          description: string
          ends_at: string | null
          icon: string
          inventory: number | null
          item_type: string
          kind: string
          name: string
          partner_name: string | null
          preview: Json
          published: boolean
          redemption_instructions: string | null
          sold: number
          sort_order: number
          sponsor_url: string | null
          starts_at: string | null
          unlock_criteria: Json
        }
        Insert: {
          active?: boolean
          code: string
          code_expires_days?: number | null
          cost?: number
          description?: string
          ends_at?: string | null
          icon?: string
          inventory?: number | null
          item_type?: string
          kind?: string
          name: string
          partner_name?: string | null
          preview?: Json
          published?: boolean
          redemption_instructions?: string | null
          sold?: number
          sort_order?: number
          sponsor_url?: string | null
          starts_at?: string | null
          unlock_criteria?: Json
        }
        Update: {
          active?: boolean
          code?: string
          code_expires_days?: number | null
          cost?: number
          description?: string
          ends_at?: string | null
          icon?: string
          inventory?: number | null
          item_type?: string
          kind?: string
          name?: string
          partner_name?: string | null
          preview?: Json
          published?: boolean
          redemption_instructions?: string | null
          sold?: number
          sort_order?: number
          sponsor_url?: string | null
          starts_at?: string | null
          unlock_criteria?: Json
        }
        Relationships: []
      }
      scan_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          marker_id: string
          token: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          marker_id: string
          token?: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          marker_id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      trail_checkins: {
        Row: {
          created_at: string
          id: string
          marker_id: string
          method: string
          session_id: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          marker_id: string
          method: string
          session_id: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          marker_id?: string
          method?: string
          session_id?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trail_checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trail_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_revisions: {
        Row: {
          distance_m: number
          duration_s: number
          id: string
          legs: Json
          published_at: string
          stops: Json
          trail_id: string
          version: number
        }
        Insert: {
          distance_m?: number
          duration_s?: number
          id?: string
          legs?: Json
          published_at?: string
          stops?: Json
          trail_id: string
          version: number
        }
        Update: {
          distance_m?: number
          duration_s?: number
          id?: string
          legs?: Json
          published_at?: string
          stops?: Json
          trail_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "trail_revisions_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_route_cache: {
        Row: {
          created_at: string
          distance_m: number
          duration_s: number
          key: string
          polyline: string
        }
        Insert: {
          created_at?: string
          distance_m: number
          duration_s: number
          key: string
          polyline: string
        }
        Update: {
          created_at?: string
          distance_m?: number
          duration_s?: number
          key?: string
          polyline?: string
        }
        Relationships: []
      }
      trail_sessions: {
        Row: {
          completed_at: string | null
          id: string
          revision_id: string
          started_at: string
          status: string
          trail_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          revision_id: string
          started_at?: string
          status?: string
          trail_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          revision_id?: string
          started_at?: string
          status?: string
          trail_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_sessions_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "trail_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_sessions_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_stops: {
        Row: {
          id: string
          marker_id: string
          note: string
          position: number
          required: boolean
          trail_id: string
        }
        Insert: {
          id?: string
          marker_id: string
          note?: string
          position?: number
          required?: boolean
          trail_id: string
        }
        Update: {
          id?: string
          marker_id?: string
          note?: string
          position?: number
          required?: boolean
          trail_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_stops_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trails: {
        Row: {
          accessibility: string | null
          city: string
          cover_path: string | null
          created_at: string
          created_by: string | null
          current_revision_id: string | null
          description: string
          id: string
          is_loop: boolean
          slug: string
          status: string
          terrain: string | null
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          accessibility?: string | null
          city?: string
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          current_revision_id?: string | null
          description?: string
          id?: string
          is_loop?: boolean
          slug: string
          status?: string
          terrain?: string | null
          theme?: string
          title: string
          updated_at?: string
        }
        Update: {
          accessibility?: string | null
          city?: string
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          current_revision_id?: string | null
          description?: string
          id?: string
          is_loop?: boolean
          slug?: string
          status?: string
          terrain?: string | null
          theme?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_code: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_code: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_code?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_code_fkey"
            columns: ["achievement_code"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["code"]
          },
        ]
      }
      user_postcards: {
        Row: {
          collected_at: string
          id: string
          postcard_id: string
          user_id: string
        }
        Insert: {
          collected_at?: string
          id?: string
          postcard_id: string
          user_id: string
        }
        Update: {
          collected_at?: string
          id?: string
          postcard_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_postcards_postcard_id_fkey"
            columns: ["postcard_id"]
            isOneToOne: false
            referencedRelation: "postcards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust: {
        Args: {
          _actor: string
          _amount: number
          _key: string
          _reason: string
          _user: string
        }
        Returns: Json
      }
      can_edit_collections: { Args: { _user_id: string }; Returns: boolean }
      can_manage_marker: {
        Args: { _slug: string; _user_id: string }
        Returns: boolean
      }
      collection_marker_blockers: {
        Args: { _marker: string }
        Returns: string[]
      }
      get_shared_visits: {
        Args: { _code: string }
        Returns: {
          avatar_url: string
          display_name: string
          marker_id: string
          visited_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_creator: { Args: { _user_id: string }; Returns: boolean }
      purchase_item: {
        Args: { _code: string; _key: string; _user: string }
        Returns: Json
      }
      refund_redemption: {
        Args: { _actor: string; _reason: string; _redemption: string }
        Returns: Json
      }
      set_collection_status: {
        Args: { _ids: string[]; _publish: boolean }
        Returns: Json
      }
      spend_campaign_budget: {
        Args: { _amount: number; _code: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "creator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "creator"],
    },
  },
} as const
