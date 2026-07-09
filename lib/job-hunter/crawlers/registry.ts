import { crawlAshbyCompany } from '@/lib/job-hunter/crawlers/ashby'
import { crawlDayforceCompany } from '@/lib/job-hunter/crawlers/dayforce'
import { crawlGreenhouseCompany } from '@/lib/job-hunter/crawlers/greenhouse'
import { crawlIcimsCompany } from '@/lib/job-hunter/crawlers/icims'
import { crawlLeverCompany } from '@/lib/job-hunter/crawlers/lever'
import { crawlOracleCloudCompany } from '@/lib/job-hunter/crawlers/oraclecloud'
import { crawlSmartRecruitersCompany } from '@/lib/job-hunter/crawlers/smartrecruiters'
import type { CrawlOptions } from '@/lib/job-hunter/crawlers/types'
import { crawlUltiproCompany } from '@/lib/job-hunter/crawlers/ultipro'
import { crawlWorkdayCompany } from '@/lib/job-hunter/crawlers/workday'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'

export const SUPPORTED_ATS_PLATFORMS = [
  'workday',
  'greenhouse',
  'lever',
  'ashby',
  'oraclecloud',
  'dayforce',
  'ultipro',
  'smartrecruiters',
  'icims',
] as const

export type SupportedAtsPlatform = (typeof SUPPORTED_ATS_PLATFORMS)[number]

export type CrawlableJobSource = {
  company: string
  baseUrl: string
  ats_platform: SupportedAtsPlatform
}

export type CrawledJob = Omit<JobHunterJob, 'id'>

const SUPPORTED_ATS_PLATFORM_SET = new Set<string>(SUPPORTED_ATS_PLATFORMS)

const crawlerRegistry: Record<
  SupportedAtsPlatform,
  (source: CrawlableJobSource, options?: CrawlOptions) => Promise<CrawledJob[]>
> = {
  workday: ({ company, baseUrl }, options) =>
    crawlWorkdayCompany({ company, baseUrl }, options),
  greenhouse: ({ company, baseUrl }, options) =>
    crawlGreenhouseCompany({ company, baseUrl, ats_platform: 'greenhouse' }, options),
  lever: ({ company, baseUrl }, options) =>
    crawlLeverCompany({ company, baseUrl, ats_platform: 'lever' }, options),
  ashby: ({ company, baseUrl }, options) =>
    crawlAshbyCompany({ company, baseUrl, ats_platform: 'ashby' }, options),
  oraclecloud: ({ company, baseUrl }, options) =>
    crawlOracleCloudCompany(
      { company, baseUrl, ats_platform: 'oraclecloud' },
      options,
    ),
  dayforce: ({ company, baseUrl }, options) =>
    crawlDayforceCompany({ company, baseUrl, ats_platform: 'dayforce' }, options),
  ultipro: ({ company, baseUrl }, options) =>
    crawlUltiproCompany({ company, baseUrl, ats_platform: 'ultipro' }, options),
  smartrecruiters: ({ company, baseUrl }, options) =>
    crawlSmartRecruitersCompany(
      { company, baseUrl, ats_platform: 'smartrecruiters' },
      options,
    ),
  icims: ({ company, baseUrl }, options) =>
    crawlIcimsCompany({ company, baseUrl, ats_platform: 'icims' }, options),
}

export function isSupportedAtsPlatform(
  value: string,
): value is SupportedAtsPlatform {
  return SUPPORTED_ATS_PLATFORM_SET.has(value)
}

export function crawlJobsForSource(
  source: CrawlableJobSource,
  options?: CrawlOptions,
) {
  return crawlerRegistry[source.ats_platform](source, options)
}
