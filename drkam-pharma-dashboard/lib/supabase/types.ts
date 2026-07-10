/**
 * Kiểu dữ liệu Database cho Supabase client.
 * Khớp với schema trong supabase/migrations/0001_init.sql.
 * (Có thể tự sinh lại bằng: `supabase gen types typescript`.)
 */

type Role = 'Admin' | 'Leader' | 'Nhân viên';

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: { id: string; name: string; leader_id: string | null; created_at: string };
        Insert: { id?: string; name: string; leader_id?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['teams']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: Role;
          department: string | null;
          status: 'Hoạt động' | 'Đã khóa';
          avatar: string | null;
          channel_count: number;
          team_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role?: Role;
          department?: string | null;
          status?: 'Hoạt động' | 'Đã khóa';
          avatar?: string | null;
          channel_count?: number;
          team_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      channels: {
        Row: {
          id: string;
          name: string;
          brand_category: string | null;
          platform: 'TikTok' | 'Facebook' | 'Shopee' | 'YouTube';
          channel_type: 'Brand' | 'Real KOC' | 'AI KOC';
          linked_shop: 'true' | 'false' | 'disconnected';
          audit_id: string | null;
          manager_id: string | null;
          manager_name: string | null;
          manager_avatar: string | null;
          status: 'Đã ra số' | 'Đang nuôi' | 'Bóp TT' | 'Đã khóa';
          track_revenue: boolean;
          track_traffic: boolean;
          team_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['channels']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['channels']['Insert']>;
        Relationships: [];
      };
      daily_reports: {
        Row: {
          id: string;
          report_date: string;
          channel_id: string;           // NOT NULL từ migration 0002
          channel_name: string | null;
          channel_type: string | null;
          revenue: number;
          source_platform: string;      // NOT NULL DEFAULT 'manual' từ 0002
          created_by: string;
          created_by_role: string | null;
          views_reach: number | null;
          comment: number | null;
          like_count: number | null;
          share: number | null;
          save_count: number | null;
          view_all_rate: number | null;
          avg_view_duration: number | null;
          follower_incr: number | null;
          note: string | null;
          video_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['daily_reports']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['daily_reports']['Insert']>;
        Relationships: [];
      };
      targets: {
        Row: {
          id: string;
          employee_id: string | null;
          employee_name: string;
          employee_role: string | null;
          department: string | null;
          month: string | null;
          target_revenue: number;
          achieved_revenue: number;
          avatar: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['targets']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['targets']['Insert']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          ts: string;
          operator_id: string | null;
          operator: string;
          action: string;
          module: string;
          ip_address: string | null;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'ts'> & {
          id?: string;
          ts?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
      fb_pages: {
        Row: {
          id: string;
          channel_id: string;
          name: string;
          added_by: string | null;
          added_by_name: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fb_pages']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['fb_pages']['Insert']>;
        Relationships: [];
      };
      content_checklists: {
        Row: {
          id: string;
          checklist_date: string;
          employee_id: string;
          employee_name: string;
          label: string;
          quantity: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['content_checklists']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['content_checklists']['Insert']>;
        Relationships: [];
      };
      media_task_logs: {
        Row: {
          id: string;
          log_date: string;
          employee_id: string;
          employee_name: string;
          content_type: string;
          script_no: string | null;
          task: string;
          quantity: number | null;
          progress: 'Hoàn thành' | 'Đang làm' | 'Chưa làm';
          product_link: string | null;
          note: string | null;
          approval: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['media_task_logs']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['media_task_logs']['Insert']>;
        Relationships: [];
      };
      media_kpi_entries: {
        Row: {
          id: string;
          period: string;
          employee_id: string;
          employee_name: string;
          role_scope: 'Leader' | 'NV';
          stt: number;
          group_name: string;
          metric: string;
          target_value: number;
          unit: 'number' | 'currency' | 'percent';
          weight: number;
          actual_value: number;
          note: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['media_kpi_entries']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['media_kpi_entries']['Insert']>;
        Relationships: [];
      };
      media_improvements: {
        Row: {
          id: string;
          period: string;
          stt: number;
          issue: string;
          proposal: string;
          benefit: string | null;
          priority: 'Cao' | 'Trung bình' | 'Thấp';
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['media_improvements']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['media_improvements']['Insert']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
