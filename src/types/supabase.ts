export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          auth_user_id: string
          age: number
          life_expectancy: number
          chronotype: 'lion' | 'bear' | 'wolf' | 'dolphin'
          baseline_dws: number
          baseline_daily_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          age?: number
          life_expectancy?: number
          chronotype?: 'lion' | 'bear' | 'wolf' | 'dolphin'
          baseline_dws?: number
          baseline_daily_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          age?: number
          life_expectancy?: number
          chronotype?: 'lion' | 'bear' | 'wolf' | 'dolphin'
          baseline_dws?: number
          baseline_daily_minutes?: number
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          protocol: 'anchor' | 'dive'
          started_at: string
          completed_at: string | null
          status: 'idle' | 'running' | 'paused' | 'completed' | 'aborted'
          total_deep_minutes: number
          interruption_count: number
          self_reported_focus: number | null
          micro_pauses_delivered: number
          micro_pauses_missed: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          protocol: 'anchor' | 'dive'
          started_at?: string
          completed_at?: string | null
          status?: 'idle' | 'running' | 'paused' | 'completed' | 'aborted'
          total_deep_minutes?: number
          interruption_count?: number
          self_reported_focus?: number | null
          micro_pauses_delivered?: number
          micro_pauses_missed?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          protocol?: 'anchor' | 'dive'
          started_at?: string
          completed_at?: string | null
          status?: 'idle' | 'running' | 'paused' | 'completed' | 'aborted'
          total_deep_minutes?: number
          interruption_count?: number
          self_reported_focus?: number | null
          micro_pauses_delivered?: number
          micro_pauses_missed?: number
          created_at?: string
        }
      }
      phases: {
        Row: {
          id: string
          session_id: string
          phase_index: number
          phase_type: 'sensory_reset' | 'visual_priming' | 'sprint' | 'micro_rest' | 'deep_block' | 'trough'
          planned_duration_ms: number
          actual_duration_ms: number | null
          started_at: string | null
          ended_at: string | null
          completed: boolean
          skipped: boolean
          server_timestamp_end: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          phase_index: number
          phase_type: 'sensory_reset' | 'visual_priming' | 'sprint' | 'micro_rest' | 'deep_block' | 'trough'
          planned_duration_ms: number
          actual_duration_ms?: number | null
          started_at?: string | null
          ended_at?: string | null
          completed?: boolean
          skipped?: boolean
          server_timestamp_end?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          phase_index?: number
          phase_type?: 'sensory_reset' | 'visual_priming' | 'sprint' | 'micro_rest' | 'deep_block' | 'trough'
          planned_duration_ms?: number
          actual_duration_ms?: number | null
          started_at?: string | null
          ended_at?: string | null
          completed?: boolean
          skipped?: boolean
          server_timestamp_end?: number | null
          created_at?: string
        }
      }
      analytics_snapshots: {
        Row: {
          id: string
          user_id: string
          date: string
          dws: number
          efficiency_ratio: number
          vs_baseline_multiplier: number
          daily_growth_rate: number | null
          lifetime_hours_banked: number
          productive_years_saved: number
          waking_life_saved: number
          trough_compliance_pct: number
          micro_pause_fidelity_pct: number | null
          sessions_completed: number
          total_deep_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          dws?: number
          efficiency_ratio?: number
          vs_baseline_multiplier?: number
          daily_growth_rate?: number | null
          lifetime_hours_banked?: number
          productive_years_saved?: number
          waking_life_saved?: number
          trough_compliance_pct?: number
          micro_pause_fidelity_pct?: number | null
          sessions_completed?: number
          total_deep_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          dws?: number
          efficiency_ratio?: number
          vs_baseline_multiplier?: number
          daily_growth_rate?: number | null
          lifetime_hours_banked?: number
          productive_years_saved?: number
          waking_life_saved?: number
          trough_compliance_pct?: number
          micro_pause_fidelity_pct?: number | null
          sessions_completed?: number
          total_deep_minutes?: number
          created_at?: string
          updated_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
      }
      scheduled_boundaries: {
        Row: {
          id: string
          session_id: string
          phase_id: string
          target_timestamp: number
          notification_sent: boolean
          notification_sent_at: string | null
          ack_received: boolean
          ack_received_at: string | null
          fallback_triggered: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          phase_id: string
          target_timestamp: number
          notification_sent?: boolean
          notification_sent_at?: string | null
          ack_received?: boolean
          ack_received_at?: string | null
          fallback_triggered?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          phase_id?: string
          target_timestamp?: number
          notification_sent?: boolean
          notification_sent_at?: string | null
          ack_received?: boolean
          ack_received_at?: string | null
          fallback_triggered?: boolean
          created_at?: string
        }
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
  }
}
