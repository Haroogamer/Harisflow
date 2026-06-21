import { supabaseAdmin } from '@/lib/supabase-admin'
import type { JobSource } from '@/lib/job-hunter/job-types'

export async function getEnabledJobSources() {
  const { data, error } = await supabaseAdmin
    .from('job_sources')
    .select('*')
    .eq('enabled', true)
    .eq('source_status', 'active')
    .order('last_crawled_at', { ascending: true, nullsFirst: true })

  if (error) {
    throw error
  }

  return data as JobSource[]
}
