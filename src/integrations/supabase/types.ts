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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ads_library: {
        Row: {
          ad_body: string | null
          ad_creative_url: string | null
          ad_id: string | null
          ad_title: string | null
          ad_type: string | null
          cta_text: string | null
          ended_at: string | null
          entity_id: string | null
          estimated_spend_max: number | null
          estimated_spend_min: number | null
          fetched_at: string | null
          id: string
          impressions_estimate: string | null
          is_active: boolean | null
          landing_page_url: string | null
          metadata: Json | null
          platform: string | null
          started_at: string | null
        }
        Insert: {
          ad_body?: string | null
          ad_creative_url?: string | null
          ad_id?: string | null
          ad_title?: string | null
          ad_type?: string | null
          cta_text?: string | null
          ended_at?: string | null
          entity_id?: string | null
          estimated_spend_max?: number | null
          estimated_spend_min?: number | null
          fetched_at?: string | null
          id?: string
          impressions_estimate?: string | null
          is_active?: boolean | null
          landing_page_url?: string | null
          metadata?: Json | null
          platform?: string | null
          started_at?: string | null
        }
        Update: {
          ad_body?: string | null
          ad_creative_url?: string | null
          ad_id?: string | null
          ad_title?: string | null
          ad_type?: string | null
          cta_text?: string | null
          ended_at?: string | null
          entity_id?: string | null
          estimated_spend_max?: number | null
          estimated_spend_min?: number | null
          fetched_at?: string | null
          id?: string
          impressions_estimate?: string | null
          is_active?: boolean | null
          landing_page_url?: string | null
          metadata?: Json | null
          platform?: string | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_library_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "monitored_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          entities_included: string[] | null
          id: string
          parameters: Json | null
          period_end: string | null
          period_start: string | null
          project_id: string
          status: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          entities_included?: string[] | null
          id?: string
          parameters?: Json | null
          period_end?: string | null
          period_start?: string | null
          project_id: string
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          entities_included?: string[] | null
          id?: string
          parameters?: Json | null
          period_end?: string | null
          period_start?: string | null
          project_id?: string
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_sections: {
        Row: {
          agent_prompt: string | null
          agent_response: string | null
          analysis_id: string
          completed_at: string | null
          content_html: string | null
          content_markdown: string | null
          edited_at: string | null
          edited_by: string | null
          entity_id: string | null
          id: string
          section_type: string | null
          started_at: string | null
          status: string | null
          structured_data: Json | null
          token_usage: Json | null
        }
        Insert: {
          agent_prompt?: string | null
          agent_response?: string | null
          analysis_id: string
          completed_at?: string | null
          content_html?: string | null
          content_markdown?: string | null
          edited_at?: string | null
          edited_by?: string | null
          entity_id?: string | null
          id?: string
          section_type?: string | null
          started_at?: string | null
          status?: string | null
          structured_data?: Json | null
          token_usage?: Json | null
        }
        Update: {
          agent_prompt?: string | null
          agent_response?: string | null
          analysis_id?: string
          completed_at?: string | null
          content_html?: string | null
          content_markdown?: string | null
          edited_at?: string | null
          edited_by?: string | null
          entity_id?: string | null
          id?: string
          section_type?: string | null
          started_at?: string | null
          status?: string | null
          structured_data?: Json | null
          token_usage?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_sections_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_sections_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "monitored_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      data_fetch_configs: {
        Row: {
          apify_actor_id: string | null
          apify_input: Json | null
          created_at: string | null
          entity_id: string | null
          id: string
          is_active: boolean | null
          last_fetch_at: string | null
          next_fetch_at: string | null
          schedule: string | null
          source_type: string | null
        }
        Insert: {
          apify_actor_id?: string | null
          apify_input?: Json | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_active?: boolean | null
          last_fetch_at?: string | null
          next_fetch_at?: string | null
          schedule?: string | null
          source_type?: string | null
        }
        Update: {
          apify_actor_id?: string | null
          apify_input?: Json | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_active?: boolean | null
          last_fetch_at?: string | null
          next_fetch_at?: string | null
          schedule?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_fetch_configs_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "monitored_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      data_fetch_logs: {
        Row: {
          apify_run_id: string | null
          completed_at: string | null
          config_id: string | null
          error_message: string | null
          id: string
          records_fetched: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          apify_run_id?: string | null
          completed_at?: string | null
          config_id?: string | null
          error_message?: string | null
          id?: string
          records_fetched?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          apify_run_id?: string | null
          completed_at?: string | null
          config_id?: string | null
          error_message?: string | null
          id?: string
          records_fetched?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_fetch_logs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "data_fetch_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_comments: {
        Row: {
          comment_id_instagram: string | null
          commented_at: string | null
          fetched_at: string | null
          id: string
          likes_count: number | null
          metadata: Json | null
          post_id: string | null
          replied_to: string | null
          sentiment: string | null
          sentiment_category: string | null
          text: string | null
          username: string | null
        }
        Insert: {
          comment_id_instagram?: string | null
          commented_at?: string | null
          fetched_at?: string | null
          id?: string
          likes_count?: number | null
          metadata?: Json | null
          post_id?: string | null
          replied_to?: string | null
          sentiment?: string | null
          sentiment_category?: string | null
          text?: string | null
          username?: string | null
        }
        Update: {
          comment_id_instagram?: string | null
          commented_at?: string | null
          fetched_at?: string | null
          id?: string
          likes_count?: number | null
          metadata?: Json | null
          post_id?: string | null
          replied_to?: string | null
          sentiment?: string | null
          sentiment_category?: string | null
          text?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "instagram_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_posts: {
        Row: {
          caption: string | null
          comments_count: number | null
          engagement_total: number | null
          entity_id: string | null
          fetched_at: string | null
          hashtags: string[] | null
          id: string
          is_pinned: boolean | null
          likes_count: number | null
          media_urls: string[] | null
          mentions: string[] | null
          metadata: Json | null
          post_id_instagram: string
          post_type: string | null
          post_url: string | null
          posted_at: string | null
          saves_count: number | null
          shares_count: number | null
          shortcode: string | null
          thumbnail_url: string | null
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          engagement_total?: number | null
          entity_id?: string | null
          fetched_at?: string | null
          hashtags?: string[] | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          mentions?: string[] | null
          metadata?: Json | null
          post_id_instagram: string
          post_type?: string | null
          post_url?: string | null
          posted_at?: string | null
          saves_count?: number | null
          shares_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          engagement_total?: number | null
          entity_id?: string | null
          fetched_at?: string | null
          hashtags?: string[] | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          mentions?: string[] | null
          metadata?: Json | null
          post_id_instagram?: string
          post_type?: string | null
          post_url?: string | null
          posted_at?: string | null
          saves_count?: number | null
          shares_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_posts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "monitored_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          entity_id: string | null
          followers_count: number | null
          following_count: number | null
          handle: string
          id: string
          is_verified: boolean | null
          metadata: Json | null
          posts_count: number | null
          profile_pic_url: string | null
          snapshot_date: string
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          entity_id?: string | null
          followers_count?: number | null
          following_count?: number | null
          handle: string
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          posts_count?: number | null
          profile_pic_url?: string | null
          snapshot_date: string
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          entity_id?: string | null
          followers_count?: number | null
          following_count?: number | null
          handle?: string
          id?: string
          is_verified?: boolean | null
          metadata?: Json | null
          posts_count?: number | null
          profile_pic_url?: string | null
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "monitored_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_entities: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          instagram_handle: string | null
          metadata: Json | null
          name: string
          segment: string | null
          type: Database["public"]["Enums"]["entity_type"]
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          instagram_handle?: string | null
          metadata?: Json | null
          name: string
          segment?: string | null
          type: Database["public"]["Enums"]["entity_type"]
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          instagram_handle?: string | null
          metadata?: Json | null
          name?: string
          segment?: string | null
          type?: Database["public"]["Enums"]["entity_type"]
          website_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          project_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          project_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          project_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_key_results: {
        Row: {
          created_at: string | null
          current_value: number | null
          data_source: string | null
          id: string
          metric_type: string | null
          objective_id: string
          target_value: number
          title: string
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          data_source?: string | null
          id?: string
          metric_type?: string | null
          objective_id: string
          target_value: number
          title: string
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          data_source?: string | null
          id?: string
          metric_type?: string | null
          objective_id?: string
          target_value?: number
          title?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "okr_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_measurements: {
        Row: {
          created_at: string | null
          id: string
          key_result_id: string
          measured_at: string
          notes: string | null
          source: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_result_id: string
          measured_at: string
          notes?: string | null
          source?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          key_result_id?: string
          measured_at?: string
          notes?: string | null
          source?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "okr_measurements_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "okr_key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_objectives: {
        Row: {
          channel: string | null
          created_at: string | null
          description: string | null
          id: string
          project_id: string
          quarter: string
          status: string | null
          title: string
          year: number
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          project_id: string
          quarter: string
          status?: string | null
          title: string
          year: number
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          project_id?: string
          quarter?: string
          status?: string | null
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "okr_objectives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_calendars: {
        Row: {
          created_at: string | null
          generated_from_analysis: string | null
          id: string
          period_end: string | null
          period_start: string | null
          period_type: string | null
          project_id: string
          status: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          generated_from_analysis?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          project_id: string
          status?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          generated_from_analysis?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          project_id?: string
          status?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_calendars_generated_from_analysis_fkey"
            columns: ["generated_from_analysis"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_calendars_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_items: {
        Row: {
          budget: number | null
          calendar_id: string
          channel: string | null
          content_type: string | null
          copy_text: string | null
          created_at: string | null
          description: string | null
          format: string | null
          hashtags: string[] | null
          id: string
          keywords: string[] | null
          metadata: Json | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
          target_audience: string | null
          theme: string | null
          title: string
          visual_brief: string | null
        }
        Insert: {
          budget?: number | null
          calendar_id: string
          channel?: string | null
          content_type?: string | null
          copy_text?: string | null
          created_at?: string | null
          description?: string | null
          format?: string | null
          hashtags?: string[] | null
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          target_audience?: string | null
          theme?: string | null
          title: string
          visual_brief?: string | null
        }
        Update: {
          budget?: number | null
          calendar_id?: string
          channel?: string | null
          content_type?: string | null
          copy_text?: string | null
          created_at?: string | null
          description?: string | null
          format?: string | null
          hashtags?: string[] | null
          id?: string
          keywords?: string[] | null
          metadata?: Json | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          target_audience?: string | null
          theme?: string | null
          title?: string
          visual_brief?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_items_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "planning_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_entities: {
        Row: {
          entity_id: string
          entity_role: Database["public"]["Enums"]["entity_type"]
          id: string
          priority: number | null
          project_id: string
        }
        Insert: {
          entity_id: string
          entity_role: Database["public"]["Enums"]["entity_type"]
          id?: string
          priority?: number | null
          project_id: string
        }
        Update: {
          entity_id?: string
          entity_role?: Database["public"]["Enums"]["entity_type"]
          id?: string
          priority?: number | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_entities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "monitored_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_entities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_member_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          brand_description: string | null
          brand_name: string
          briefing: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          instagram_handle: string | null
          keywords: string[] | null
          logo_url: string | null
          name: string
          segment: string | null
          slug: string
          status: string | null
          target_audience: string | null
          tone_of_voice: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          brand_description?: string | null
          brand_name: string
          briefing?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          instagram_handle?: string | null
          keywords?: string[] | null
          logo_url?: string | null
          name: string
          segment?: string | null
          slug: string
          status?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          brand_description?: string | null
          brand_name?: string
          briefing?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          instagram_handle?: string | null
          keywords?: string[] | null
          logo_url?: string | null
          name?: string
          segment?: string | null
          slug?: string
          status?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          analysis_id: string | null
          approved_by: string | null
          big_numbers: Json | null
          content_html: string | null
          content_markdown: string | null
          created_at: string | null
          created_by: string | null
          exported_pdf_url: string | null
          id: string
          project_id: string
          published_at: string | null
          sections_order: string[] | null
          status: string | null
          title: string
          type: string | null
        }
        Insert: {
          analysis_id?: string | null
          approved_by?: string | null
          big_numbers?: Json | null
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string | null
          created_by?: string | null
          exported_pdf_url?: string | null
          id?: string
          project_id: string
          published_at?: string | null
          sections_order?: string[] | null
          status?: string | null
          title: string
          type?: string | null
        }
        Update: {
          analysis_id?: string | null
          approved_by?: string | null
          big_numbers?: Json | null
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string | null
          created_by?: string | null
          exported_pdf_url?: string | null
          id?: string
          project_id?: string
          published_at?: string | null
          sections_order?: string[] | null
          status?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_data: {
        Row: {
          backlinks_count: number | null
          domain_authority: number | null
          entity_id: string | null
          fetched_at: string | null
          id: string
          keyword: string
          metadata: Json | null
          organic_traffic_estimate: number | null
          position: number | null
          search_volume: number | null
          snapshot_date: string
          url_ranking: string | null
        }
        Insert: {
          backlinks_count?: number | null
          domain_authority?: number | null
          entity_id?: string | null
          fetched_at?: string | null
          id?: string
          keyword: string
          metadata?: Json | null
          organic_traffic_estimate?: number | null
          position?: number | null
          search_volume?: number | null
          snapshot_date: string
          url_ranking?: string | null
        }
        Update: {
          backlinks_count?: number | null
          domain_authority?: number | null
          entity_id?: string | null
          fetched_at?: string | null
          id?: string
          keyword?: string
          metadata?: Json | null
          organic_traffic_estimate?: number | null
          position?: number | null
          search_volume?: number | null
          snapshot_date?: string
          url_ranking?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_data_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "monitored_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_dashboard_stats: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_entity_accessible: {
        Args: { _entity_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer"
      entity_type: "competitor" | "influencer" | "inspiration"
      project_member_role: "owner" | "editor" | "viewer"
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
      app_role: ["admin", "analyst", "viewer"],
      entity_type: ["competitor", "influencer", "inspiration"],
      project_member_role: ["owner", "editor", "viewer"],
    },
  },
} as const
