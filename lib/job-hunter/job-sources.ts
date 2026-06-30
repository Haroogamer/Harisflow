import { supabaseAdmin } from '@/lib/supabase-admin'
import type { JobSource } from '@/lib/job-hunter/job-types'

export async function getEnabledJobSources() {
  const { data, error } = await supabaseAdmin
    .from('job_sources')
    .select('*')
    .eq('enabled', true)
    .eq('source_status', 'active')
    // Crawl the stalest active sources first, then prefer sources with recent hits
    // when multiple sources have the same crawl age.
    .order('last_crawled_at', { ascending: true, nullsFirst: true })
    .order('last_job_found_at', { ascending: false, nullsFirst: false })

  if (error) {
    throw error
  }

  return data as JobSource[]
}
