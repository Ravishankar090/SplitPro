export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      groups: {
        Row: { id: string; name: string; invite_code: string; created_at: string };
        Insert: { id?: string; name: string; invite_code?: string; created_at?: string };
        Update: { id?: string; name?: string; invite_code?: string; created_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: { id: string; name: string; phone: string | null; group_id: string | null; avatar_color: string; created_at: string };
        Insert: { id: string; name?: string; phone?: string | null; group_id?: string | null; avatar_color?: string; created_at?: string };
        Update: { id?: string; name?: string; phone?: string | null; group_id?: string | null; avatar_color?: string; created_at?: string };
        Relationships: [{ foreignKeyName: "profiles_group_id_fkey"; columns: ["group_id"]; referencedRelation: "groups"; referencedColumns: ["id"] }];
      };
      bills: {
        Row: { id: string; group_id: string; title: string; amount: number; paid_by: string; date: string; is_recurring: boolean; recurring_freq: string | null; recurring_next_due: string | null; recurring_status: string; created_by: string; created_at: string };
        Insert: { id?: string; group_id: string; title: string; amount: number; paid_by: string; date?: string; is_recurring?: boolean; recurring_freq?: string | null; recurring_next_due?: string | null; recurring_status?: string; created_by: string; created_at?: string };
        Update: { id?: string; group_id?: string; title?: string; amount?: number; paid_by?: string; date?: string; is_recurring?: boolean; recurring_freq?: string | null; recurring_next_due?: string | null; recurring_status?: string; created_by?: string; created_at?: string };
        Relationships: [];
      };
      bill_splits: {
        Row: { id: string; bill_id: string; user_id: string; amount: number; is_payer: boolean; settled: boolean; settled_at: string | null; created_at: string };
        Insert: { id?: string; bill_id: string; user_id: string; amount: number; is_payer?: boolean; settled?: boolean; settled_at?: string | null; created_at?: string };
        Update: { id?: string; bill_id?: string; user_id?: string; amount?: number; is_payer?: boolean; settled?: boolean; settled_at?: string | null; created_at?: string };
        Relationships: [];
      };
      bill_history: {
        Row: { id: string; bill_id: string; month: string; amount: number; paid: boolean; paid_by: string | null; note: string | null; created_at: string };
        Insert: { id?: string; bill_id: string; month: string; amount: number; paid?: boolean; paid_by?: string | null; note?: string | null; created_at?: string };
        Update: { id?: string; bill_id?: string; month?: string; amount?: number; paid?: boolean; paid_by?: string | null; note?: string | null; created_at?: string };
        Relationships: [];
      };
      shopping_items: {
        Row: { id: string; group_id: string; name: string; qty: number; unit: string; store: string; requested_by: string; status: string; bought_by: string | null; price: number | null; created_at: string };
        Insert: { id?: string; group_id: string; name: string; qty?: number; unit?: string; store: string; requested_by: string; status?: string; bought_by?: string | null; price?: number | null; created_at?: string };
        Update: { id?: string; group_id?: string; name?: string; qty?: number; unit?: string; store?: string; requested_by?: string; status?: string; bought_by?: string | null; price?: number | null; created_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// Convenience types
export type Profile      = Database["public"]["Tables"]["profiles"]["Row"];
export type Group        = Database["public"]["Tables"]["groups"]["Row"];
export type Bill         = Database["public"]["Tables"]["bills"]["Row"];
export type BillSplit    = Database["public"]["Tables"]["bill_splits"]["Row"];
export type BillHistory  = Database["public"]["Tables"]["bill_history"]["Row"];
export type ShoppingItem = Database["public"]["Tables"]["shopping_items"]["Row"];

// Extended types with joins
export type BillWithSplits = Bill & {
  splits:  (BillSplit  & { profile: Profile })[];
  payer:   Profile;
  history?: BillHistory[];
};

export type PersonBalance = {
  person:     Profile;
  net:        number;   // positive = they owe me, negative = I owe them
  owedToMe:   number;
  iOwe:       number;
  items:      { bill: BillWithSplits; dir: "owes_me" | "i_owe"; amt: number }[];
};

// Receipt scan result
export type ScanResult = {
  merchant: string | null;
  date:     string | null;
  items:    { name: string; qty: number; price: number }[];
  total:    number;
};
