export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          company: string
          ats_platform: string
          title: string
          location: string
          job_url: string
          job_hash: string
          date_discovered: string
          date_posted: string | null
          status: 'new' | 'saved' | 'applied' | 'dismissed'
          job_description: string | null
        }
        Insert: {
          id?: string
          company: string
          ats_platform: string
          title: string
          location: string
          job_url: string
          job_hash: string
          date_discovered?: string
          date_posted?: string | null
          status: 'new' | 'saved' | 'applied' | 'dismissed'
          job_description?: string | null
        }
        Update: {
          id?: string
          company?: string
          ats_platform?: string
          title?: string
          location?: string
          job_url?: string
          job_hash?: string
          date_discovered?: string
          date_posted?: string | null
          status?: 'new' | 'saved' | 'applied' | 'dismissed'
          job_description?: string | null
        }
        Relationships: []
      }
      job_sources: {
        Row: {
          id: string
          company: string
          ats_platform: string
          careers_url: string
          enabled: boolean
          crawl_interval_minutes: number
          last_crawled_at: string | null
          last_success_at: string | null
          last_job_found_at: string | null
          source_status: string
          failure_count: number
          crawler_config: Record<string, unknown> | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company: string
          ats_platform: string
          careers_url: string
          enabled?: boolean
          crawl_interval_minutes?: number
          last_crawled_at?: string | null
          last_success_at?: string | null
          last_job_found_at?: string | null
          source_status?: string
          failure_count?: number
          crawler_config?: Record<string, unknown> | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company?: string
          ats_platform?: string
          careers_url?: string
          enabled?: boolean
          crawl_interval_minutes?: number
          last_crawled_at?: string | null
          last_success_at?: string | null
          last_job_found_at?: string | null
          source_status?: string
          failure_count?: number
          crawler_config?: Record<string, unknown> | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          id: string
          name: string | null
          email: string | null
          request: string | null
          summary: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          email?: string | null
          request?: string | null
          summary?: string | null
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          request?: string | null
          summary?: string | null
          status?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
