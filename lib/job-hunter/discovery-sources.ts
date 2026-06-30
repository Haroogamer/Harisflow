import type { GreenhouseCompanyConfig } from '@/lib/job-hunter/crawlers/greenhouse'
import type { WorkdayCompanyConfig } from '@/lib/job-hunter/crawlers/workday'
import type { LeverCompanyConfig } from '@/lib/job-hunter/crawlers/lever'
import type { AshbyCompanyConfig } from '@/lib/job-hunter/crawlers/ashby'
import type { OracleCloudCompanyConfig } from '@/lib/job-hunter/crawlers/oraclecloud'
import type { DayforceCompanyConfig } from '@/lib/job-hunter/crawlers/dayforce'
import type { UltiproCompanyConfig } from '@/lib/job-hunter/crawlers/ultipro'

type WorkdayDiscoverySource = WorkdayCompanyConfig & {
  ats_platform: 'workday'
}

export type DiscoverySource =
  | WorkdayDiscoverySource
  | GreenhouseCompanyConfig
  | LeverCompanyConfig
  | AshbyCompanyConfig
  | OracleCloudCompanyConfig
  | DayforceCompanyConfig
  | UltiproCompanyConfig

export const DISCOVERY_SOURCES: DiscoverySource[] = [
  {
    company: 'Guidehouse',
    baseUrl: 'https://guidehouse.wd1.myworkdayjobs.com/en-US/External',
    ats_platform: 'workday',
  },
]
