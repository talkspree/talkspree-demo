import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase Configuration Error:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
  console.error('Make sure you have restarted the dev server after creating .env file!');
  throw new Error('Missing Supabase environment variables. Check console for details.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          date_of_birth: string;
          gender: string;
          location: string;
          occupation: string;
          bio: string;
          phone: string;
          profile_picture_url: string | null;
          role: 'mentor' | 'mentee' | 'alumni' | null;
          university: string | null;
          study_field: string | null;
          work_place: string | null;
          industry: string | null;
          is_online: boolean;
          in_call: boolean;
          session_duration: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      user_interests: {
        Row: {
          id: string;
          user_id: string;
          interest_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_interests']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_interests']['Insert']>;
      };
      social_links: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          url: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['social_links']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['social_links']['Insert']>;
      };
      circles: {
        Row: {
          id: string;
          name: string;
          description: string;
          invite_code: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['circles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['circles']['Insert']>;
      };
      circle_members: {
        Row: {
          id: string;
          circle_id: string;
          user_id: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['circle_members']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['circle_members']['Insert']>;
      };
      call_history: {
        Row: {
          id: string;
          caller_id: string;
          recipient_id: string;
          circle_id: string | null;
          started_at: string;
          ended_at: string | null;
          duration: number | null;
          rating: number | null;
          feedback: string | null;
        };
        Insert: Omit<Database['public']['Tables']['call_history']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['call_history']['Insert']>;
      };
      invite_codes: {
        Row: {
          id: string;
          code: string;
          circle_id: string | null;
          created_by: string;
          max_uses: number | null;
          uses_count: number;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invite_codes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['invite_codes']['Insert']>;
      };
    };
  };
}

