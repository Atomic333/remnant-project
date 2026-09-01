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
      marker_requests: {
        Row: {
          address: string | null
          created_at: string
          id: string
          location_name: string
          status: string
          submitter_email: string | null
          why_it_matters: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          location_name: string
          status?: string
          submitter_email?: string | null
          why_it_matters: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          location_name?: string
          status?: string
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
          category: string
          city: string
          created_at: string
          created_by: string | null
          id: string
          image_path: string | null
          lat: number
          lng: number
          name: string
          published: boolean
          rarity: string
          slug: string
          sources: Json
          story: string
          street_view: Json | null
          summary: string
          updated_at: string
        }
        Insert: {
          address?: string
          category?: string
          city?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string | null
          lat: number
          lng: number
          name: string
          published?: boolean
          rarity?: string
          slug: string
          sources?: Json
          story?: string
          street_view?: Json | null
          summary?: string
          updated_at?: string
        }
        Update: {
          address?: string
          category?: string
          city?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string | null
          lat?: number
          lng?: number
          name?: string
          published?: boolean
          rarity?: string
          slug?: string
          sources?: Json
          story?: string
          street_view?: Json | null
          summary?: string
          updated_at?: string
        }
        Relationships: []
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
      redemptions: {
        Row: {
          created_at: string
          id: string
          quest_spent: number
          redemption_code: string | null
          reward_code: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quest_spent: number
          redemption_code?: string | null
          reward_code: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quest_spent?: number
          redemption_code?: string | null
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
      reward_events: {
        Row: {
          chain_id: string | null
          chain_tx_hash: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          quest_amount: number
          settled_at: string | null
          settlement_status: string
          source_id: string | null
          source_type: string | null
          title: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          chain_id?: string | null
          chain_tx_hash?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          quest_amount: number
          settled_at?: string | null
          settlement_status?: string
          source_id?: string | null
          source_type?: string | null
          title?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          chain_id?: string | null
          chain_tx_hash?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          quest_amount?: number
          settled_at?: string | null
          settlement_status?: string
          source_id?: string | null
          source_type?: string | null
          title?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      rewards_catalog: {
        Row: {
          active: boolean
          code: string
          cost: number
          description: string
          icon: string
          kind: string
          name: string
          partner_name: string | null
          sort_order: number
          unlock_criteria: Json
        }
        Insert: {
          active?: boolean
          code: string
          cost?: number
          description?: string
          icon?: string
          kind?: string
          name: string
          partner_name?: string | null
          sort_order?: number
          unlock_criteria?: Json
        }
        Update: {
          active?: boolean
          code?: string
          cost?: number
          description?: string
          icon?: string
          kind?: string
          name?: string
          partner_name?: string | null
          sort_order?: number
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
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
