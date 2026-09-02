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
      environmental_records: {
        Row: {
          amount: number
          created_at: string
          evidence_url: string | null
          id: string
          notes: string | null
          project_id: string
          recorded_at: string
          sdg_codes: number[]
          tokens_minted: number
          unit: Database["public"]["Enums"]["record_unit"]
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          project_id: string
          recorded_at?: string
          sdg_codes?: number[]
          tokens_minted?: number
          unit: Database["public"]["Enums"]["record_unit"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          evidence_url?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          recorded_at?: string
          sdg_codes?: number[]
          tokens_minted?: number
          unit?: Database["public"]["Enums"]["record_unit"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "environmental_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          kind: Database["public"]["Enums"]["user_kind"]
          language: string
          organization: string | null
          preferred_network: Database["public"]["Enums"]["stellar_network"]
          stellar_public_key: string | null
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          kind?: Database["public"]["Enums"]["user_kind"]
          language?: string
          organization?: string | null
          preferred_network?: Database["public"]["Enums"]["stellar_network"]
          stellar_public_key?: string | null
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["user_kind"]
          language?: string
          organization?: string | null
          preferred_network?: Database["public"]["Enums"]["stellar_network"]
          stellar_public_key?: string | null
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          owner_id: string
          sector: Database["public"]["Enums"]["project_sector"]
          status: Database["public"]["Enums"]["project_status"]
          total_tokens: number
          unit: Database["public"]["Enums"]["record_unit"]
          updated_at: string
        }
        Insert: {
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          owner_id: string
          sector: Database["public"]["Enums"]["project_sector"]
          status?: Database["public"]["Enums"]["project_status"]
          total_tokens?: number
          unit: Database["public"]["Enums"]["record_unit"]
          updated_at?: string
        }
        Update: {
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string
          sector?: Database["public"]["Enums"]["project_sector"]
          status?: Database["public"]["Enums"]["project_status"]
          total_tokens?: number
          unit?: Database["public"]["Enums"]["record_unit"]
          updated_at?: string
        }
        Relationships: []
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
      wallet_transactions: {
        Row: {
          amount: number
          asset_code: string
          asset_issuer: string | null
          counterparty: string | null
          created_at: string
          id: string
          metadata: Json
          network: Database["public"]["Enums"]["stellar_network"]
          status: string
          stellar_hash: string | null
          tx_type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          asset_code: string
          asset_issuer?: string | null
          counterparty?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          network?: Database["public"]["Enums"]["stellar_network"]
          status?: string
          stellar_hash?: string | null
          tx_type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          asset_code?: string
          asset_issuer?: string | null
          counterparty?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          network?: Database["public"]["Enums"]["stellar_network"]
          status?: string
          stellar_hash?: string | null
          tx_type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_project_owners: {
        Row: {
          full_name: string | null
          id: string | null
          kind: Database["public"]["Enums"]["user_kind"] | null
          organization: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
          kind?: Database["public"]["Enums"]["user_kind"] | null
          organization?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
          kind?: Database["public"]["Enums"]["user_kind"] | null
          organization?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "verifier" | "company" | "person"
      project_sector:
        | "forestal"
        | "agricola"
        | "energia_limpia"
        | "movilidad_electrica"
        | "recuperacion_agua"
        | "transformacion_residuos"
        | "captura_co2"
      project_status:
        | "borrador"
        | "en_revision"
        | "verificado"
        | "activo"
        | "rechazado"
      record_unit:
        | "m2_reforestado"
        | "m2_agricola"
        | "kwh_renovable"
        | "kg_co2_reducido"
        | "l_agua_recuperada"
        | "kg_residuos_transformados"
      stellar_network: "testnet" | "mainnet"
      tx_type: "mint" | "send" | "receive" | "swap" | "bridge"
      user_kind: "empresa" | "persona"
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
      app_role: ["admin", "verifier", "company", "person"],
      project_sector: [
        "forestal",
        "agricola",
        "energia_limpia",
        "movilidad_electrica",
        "recuperacion_agua",
        "transformacion_residuos",
        "captura_co2",
      ],
      project_status: [
        "borrador",
        "en_revision",
        "verificado",
        "activo",
        "rechazado",
      ],
      record_unit: [
        "m2_reforestado",
        "m2_agricola",
        "kwh_renovable",
        "kg_co2_reducido",
        "l_agua_recuperada",
        "kg_residuos_transformados",
      ],
      stellar_network: ["testnet", "mainnet"],
      tx_type: ["mint", "send", "receive", "swap", "bridge"],
      user_kind: ["empresa", "persona"],
    },
  },
} as const
