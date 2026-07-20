// Hand-authored to mirror supabase/migrations. Once the project is live you can
// regenerate with: npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts

export type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";

type Rels = [];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          favorite_team: string | null;
          is_pro: boolean;
          active_group_id: string | null;
          created_at: string;
        };
        Insert: { id: string; username: string; display_name: string; avatar_url?: string | null; favorite_team?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: Rels;
      };
      competitions: {
        Row: {
          id: string;
          external_id: number | null;
          slug: string;
          name: string;
          season: number;
          logo_url: string | null;
          type: string;
          start_date: string | null;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["competitions"]["Row"]> & { slug: string; name: string; season: number };
        Update: Partial<Database["public"]["Tables"]["competitions"]["Row"]>;
        Relationships: Rels;
      };
      teams: {
        Row: {
          id: string;
          external_id: number | null;
          name: string;
          short_name: string | null;
          code: string | null;
          flag_url: string | null;
          double_points: boolean;
          is_underdog: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["teams"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["teams"]["Row"]>;
        Relationships: Rels;
      };
      matches: {
        Row: {
          id: string;
          external_id: number | null;
          competition_id: string;
          home_team_id: string | null;
          away_team_id: string | null;
          kickoff_at: string;
          status: MatchStatus;
          minute: number | null;
          home_score: number | null;
          away_score: number | null;
          winner_team_id: string | null;
          stage: string | null;
          round: string | null;
          venue: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["matches"]["Row"]> & { competition_id: string; kickoff_at: string };
        Update: Partial<Database["public"]["Tables"]["matches"]["Row"]>;
        Relationships: Rels;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          invite_code: string;
          owner_id: string;
          competition_id: string;
          color: string;
          icon: string;
          logo_url: string | null;
          is_public: boolean;
          pts_exact: number;
          pts_goal_diff: number;
          pts_result: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["groups"]["Row"]> & { name: string; owner_id: string; competition_id: string; invite_code: string };
        Update: Partial<Database["public"]["Tables"]["groups"]["Row"]>;
        Relationships: Rels;
      };
      players: {
        Row: {
          id: string;
          team_id: string;
          external_id: string;
          name: string;
          number: number | null;
          position: string | null;
          birth_date: string | null;
          photo_url: string | null;
          club: string | null;
          club_badge: string | null;
          position_detail: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["players"]["Row"]> & { team_id: string; external_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["players"]["Row"]>;
        Relationships: Rels;
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: string;
          nickname: string | null;
          underdog_team_id: string | null;
          joined_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["group_members"]["Row"]> & { group_id: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["group_members"]["Row"]>;
        Relationships: Rels;
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          group_id: string;
          home_score: number;
          away_score: number;
          winner_team_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["predictions"]["Row"]> & { user_id: string; match_id: string; group_id: string; home_score: number; away_score: number };
        Update: Partial<Database["public"]["Tables"]["predictions"]["Row"]>;
        Relationships: Rels;
      };
      bonus_markets: {
        Row: {
          id: string;
          competition_id: string;
          key: string;
          label: string;
          kind: string;
          points: number;
          closes_at: string | null;
          resolved: boolean;
          correct_team_id: string | null;
          correct_team_ids: string[] | null;
          correct_text: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["bonus_markets"]["Row"]> & { competition_id: string; key: string; label: string };
        Update: Partial<Database["public"]["Tables"]["bonus_markets"]["Row"]>;
        Relationships: Rels;
      };
      bonus_predictions: {
        Row: {
          id: string;
          user_id: string;
          market_id: string;
          group_id: string;
          team_id: string | null;
          answer_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["bonus_predictions"]["Row"]> & { user_id: string; market_id: string; group_id: string };
        Update: Partial<Database["public"]["Tables"]["bonus_predictions"]["Row"]>;
        Relationships: Rels;
      };
      messages: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["messages"]["Row"]> & { group_id: string; user_id: string; body: string };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
        Relationships: Rels;
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["push_subscriptions"]["Row"]> & { user_id: string; endpoint: string; p256dh: string; auth: string };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Row"]>;
        Relationships: Rels;
      };
    };
    Views: {
      group_standings: {
        Row: {
          group_id: string;
          user_id: string;
          total_points: number;
          match_points: number;
          bonus_points: number;
          played: number;
          exacts: number;
          correct_results: number;
        };
        Relationships: Rels;
      };
    };
    Functions: {
      join_group_by_code: { Args: { code: string }; Returns: string };
      predicted_user_ids: {
        Args: { gid: string; mids: string[] };
        Returns: { match_id: string; user_id: string }[];
      };
      set_underdog_pick: { Args: { gid: string; tid: string | null }; Returns: undefined };
      create_group: {
        Args: {
          p_name: string;
          p_competition_id: string;
          p_invite_code: string;
          p_description?: string | null;
          p_color?: string;
          p_icon?: string;
          p_pts_exact?: number;
          p_pts_goal_diff?: number;
          p_pts_result?: number;
        };
        Returns: string;
      };
    };
    Enums: { match_status: MatchStatus };
    CompositeTypes: Record<string, never>;
  };
}
