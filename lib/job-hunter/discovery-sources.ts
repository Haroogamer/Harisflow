import type { GreenhouseCompanyConfig } from '@/lib/job-hunter/crawlers/greenhouse'
import type { WorkdayCompanyConfig } from '@/lib/job-hunter/crawlers/workday'

type WorkdayDiscoverySource = WorkdayCompanyConfig & {
  ats_platform: 'workday'
}

export type DiscoverySource = WorkdayDiscoverySource | GreenhouseCompanyConfig

export const DISCOVERY_SOURCES: DiscoverySource[] = [
  {
    company: 'Guidehouse',
    baseUrl: 'https://guidehouse.wd1.myworkdayjobs.com/en-US/External',
    ats_platform: 'workday',
  },
]
