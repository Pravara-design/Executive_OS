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
      action_plans: {
        Row: {
          created_at: string
          dataset_id: string | null
          horizon_days: number
          id: string
          initiatives: Json
          progress: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_id?: string | null
          horizon_days?: number
          id?: string
          initiatives?: Json
          progress?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string | null
          horizon_days?: number
          id?: string
          initiatives?: Json
          progress?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_sessions: {
        Row: {
          created_at: string
          dataset_id: string | null
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_id?: string | null
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string | null
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_sessions_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      boardroom_conversations: {
        Row: {
          created_at: string
          dataset_id: string | null
          id: string
          messages: Json
          topic: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_id?: string | null
          id?: string
          messages?: Json
          topic: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string | null
          id?: string
          messages?: Json
          topic?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boardroom_conversations_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_briefs: {
        Row: {
          created_at: string
          dataset_id: string
          forecast_highlights: Json
          health_score: number
          id: string
          opportunities: Json
          priorities: Json
          risks: Json
          summary: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_id: string
          forecast_highlights?: Json
          health_score?: number
          id?: string
          opportunities?: Json
          priorities?: Json
          risks?: Json
          summary?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string
          forecast_highlights?: Json
          health_score?: number
          id?: string
          opportunities?: Json
          priorities?: Json
          risks?: Json
          summary?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ceo_briefs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_reports: {
        Row: {
          created_at: string
          dataset_id: string
          id: string
          impact_score: number
          investment_thesis: Json | null
          problems: Json
          recommendations: Json
          risk_score: number
          roi_score: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_id: string
          id?: string
          impact_score?: number
          investment_thesis?: Json | null
          problems?: Json
          recommendations?: Json
          risk_score?: number
          roi_score?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string
          id?: string
          impact_score?: number
          investment_thesis?: Json | null
          problems?: Json
          recommendations?: Json
          risk_score?: number
          roi_score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultant_reports_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_rows: {
        Row: {
          created_at: string
          data: Json
          dataset_id: string
          id: string
          row_index: number
        }
        Insert: {
          created_at?: string
          data: Json
          dataset_id: string
          id?: string
          row_index: number
        }
        Update: {
          created_at?: string
          data?: Json
          dataset_id?: string
          id?: string
          row_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "dataset_rows_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          column_count: number
          created_at: string
          id: string
          name: string
          row_count: number
          schema: Json
          source_filename: string | null
          user_id: string | null
        }
        Insert: {
          column_count?: number
          created_at?: string
          id?: string
          name: string
          row_count?: number
          schema?: Json
          source_filename?: string | null
          user_id?: string | null
        }
        Update: {
          column_count?: number
          created_at?: string
          id?: string
          name?: string
          row_count?: number
          schema?: Json
          source_filename?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      decision_simulations: {
        Row: {
          confidence: number
          created_at: string
          dataset_id: string
          id: string
          name: string
          profit_impact: number
          revenue_impact: number
          risk: number
          scenario: Json
          user_id: string | null
        }
        Insert: {
          confidence?: number
          created_at?: string
          dataset_id: string
          id?: string
          name?: string
          profit_impact?: number
          revenue_impact?: number
          risk?: number
          scenario?: Json
          user_id?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string
          dataset_id?: string
          id?: string
          name?: string
          profit_impact?: number
          revenue_impact?: number
          risk?: number
          scenario?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_simulations_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_decisions: {
        Row: {
          confidence_score: number
          consensus_score: number
          conversation_id: string | null
          created_at: string
          dataset_id: string | null
          decision: string
          due_date: string | null
          id: string
          next_actions: Json
          owner: string | null
          profit_impact: string | null
          progress: number
          question: string
          revenue_impact: string | null
          risk_level: string
          status: string
          timeline: string | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          consensus_score?: number
          conversation_id?: string | null
          created_at?: string
          dataset_id?: string | null
          decision: string
          due_date?: string | null
          id?: string
          next_actions?: Json
          owner?: string | null
          profit_impact?: string | null
          progress?: number
          question: string
          revenue_impact?: string | null
          risk_level?: string
          status?: string
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          consensus_score?: number
          conversation_id?: string | null
          created_at?: string
          dataset_id?: string | null
          decision?: string
          due_date?: string | null
          id?: string
          next_actions?: Json
          owner?: string | null
          profit_impact?: string | null
          progress?: number
          question?: string
          revenue_impact?: string | null
          risk_level?: string
          status?: string
          timeline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_decisions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "boardroom_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_decisions_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_results: {
        Row: {
          created_at: string
          dataset_id: string
          horizon: number
          id: string
          series: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_id: string
          horizon?: number
          id?: string
          series?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string
          horizon?: number
          id?: string
          series?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forecast_results_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          created_at: string
          dataset_id: string | null
          id: string
          kind: string
          payload: Json
          storage_path: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_id?: string | null
          id?: string
          kind?: string
          payload?: Json
          storage_path?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string | null
          id?: string
          kind?: string
          payload?: Json
          storage_path?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_summaries: {
        Row: {
          created_at: string
          dataset_id: string
          id: string
          metrics: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_id: string
          id?: string
          metrics?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string
          id?: string
          metrics?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_summaries_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
