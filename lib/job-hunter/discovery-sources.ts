import type { GreenhouseCompanyConfig } from '@/lib/job-hunter/crawlers/greenhouse'
import type { WorkdayCompanyConfig } from '@/lib/job-hunter/crawlers/workday'
import type { LeverCompanyConfig } from '@/lib/job-hunter/crawlers/lever'
import type { AshbyCompanyConfig } from '@/lib/job-hunter/crawlers/ashby'

type WorkdayDiscoverySource = WorkdayCompanyConfig & {
  ats_platform: 'workday'
}

export type DiscoverySource =
  | WorkdayDiscoverySource
  | GreenhouseCompanyConfig
  | LeverCompanyConfig
  | AshbyCompanyConfig

export const DISCOVERY_SOURCES: DiscoverySource[] = [
  {
    company: 'Guidehouse',
    baseUrl: 'https://guidehouse.wd1.myworkdayjobs.com/en-US/External',
    ats_platform: 'workday',
  },
]
