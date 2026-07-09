import type { SupportedAtsPlatform } from '@/lib/job-hunter/crawlers/registry'

type AtsSeedGroup = {
  atsPlatform: SupportedAtsPlatform
  urls: string[]
}

export const DEFAULT_BALANCED_SEED_LIMIT_PER_PLATFORM = 2

const PRIORITIZED_ATS_SEED_GROUPS: AtsSeedGroup[] = [
  {
    atsPlatform: 'greenhouse',
    urls: [
      'https://boards.greenhouse.io/servicenow',
      'https://boards.greenhouse.io/datadog',
      'https://boards.greenhouse.io/cloudflare',
      'https://boards.greenhouse.io/okta',
      'https://boards.greenhouse.io/hubspot',
      'https://boards.greenhouse.io/coinbase',
    ],
  },
  {
    atsPlatform: 'lever',
    urls: [
      'https://jobs.lever.co/snowflake',
      'https://jobs.lever.co/atlassian',
      'https://jobs.lever.co/airtable',
      'https://jobs.lever.co/openai',
    ],
  },
  {
    atsPlatform: 'ashby',
    urls: [
      'https://jobs.ashbyhq.com/notion',
      'https://jobs.ashbyhq.com/figma',
      'https://jobs.ashbyhq.com/ramp',
      'https://jobs.ashbyhq.com/retool',
    ],
  },
  {
    atsPlatform: 'smartrecruiters',
    urls: [
      'https://careers.smartrecruiters.com/Visa',
      'https://careers.smartrecruiters.com/Dynatrace',
    ],
  },
  {
    atsPlatform: 'icims',
    urls: [
      'https://careers-fisglobal.icims.com/jobs/search',
      'https://careers-splunk.icims.com/jobs/search',
    ],
  },
  {
    atsPlatform: 'dayforce',
    urls: [
      'https://jobs.dayforcehcm.com/en-US/mydayforce/alljobs',
      'https://jobs.dayforcehcm.com/en-US/trimble/alljobs',
    ],
  },
  {
    atsPlatform: 'oraclecloud',
    urls: [
      'https://edel.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/jobs',
      'https://hcrw.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
    ],
  },
  {
    atsPlatform: 'workday',
    urls: [
      'https://guidehouse.wd1.myworkdayjobs.com/en-US/External',
      'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite',
      'https://target.wd5.myworkdayjobs.com/en-US/targetcareers',
      'https://bah.wd1.myworkdayjobs.com/en-US/BAH_Jobs',
    ],
  },
  {
    atsPlatform: 'ultipro',
    urls: [
      'https://recruiting.ultipro.ca/PAS5000PASON/JobBoard/e2d2ceaa-a04e-4f8f-a0e0-0c6b5a89397c',
      'https://recruiting2.ultipro.com/UHG1004UHG/JobBoard/0f7f8c8c-2ee2-4a6f-b191-17648d5f33e0',
    ],
  },
]

const BROADER_ATS_SEED_GROUPS: AtsSeedGroup[] = [
  {
    atsPlatform: 'workday',
    urls: [
      'https://mantech.wd1.myworkdayjobs.com/en-US/External',
      'https://proofpoint.wd5.myworkdayjobs.com/ProofpointCareers',
      'https://cvshealth.wd1.myworkdayjobs.com/en-US/CVS_Health_Careers',
      'https://generalmotors.wd5.myworkdayjobs.com/en-US/Careers_GM',
      'https://dell.wd1.myworkdayjobs.com/External',
      'https://mars.wd3.myworkdayjobs.com/en-US/External',
      'https://msd.wd5.myworkdayjobs.com/en-US/SearchJobs',
      'https://wholefoods.wd5.myworkdayjobs.com/en-US/wholefoods',
    ],
  },
  {
    atsPlatform: 'smartrecruiters',
    urls: [
      'https://careers.smartrecruiters.com/DocuSign',
      'https://careers.smartrecruiters.com/NIKE',
    ],
  },
  {
    atsPlatform: 'icims',
    urls: [
      'https://careers-intuitive.icims.com/jobs/search',
      'https://careers-paychex.icims.com/jobs/search',
    ],
  },
  {
    atsPlatform: 'dayforce',
    urls: [
      'https://jobs.dayforcehcm.com/en-US/allstate/alljobs',
      'https://jobs.dayforcehcm.com/en-US/adayinlife/alljobs',
    ],
  },
]

function flattenSeedGroups(groups: AtsSeedGroup[]) {
  return groups.flatMap((group) => group.urls)
}

function dedupeUrls(urls: string[]) {
  return Array.from(new Set(urls))
}

export function getPrioritizedAtsJobUrls() {
  return dedupeUrls(flattenSeedGroups(PRIORITIZED_ATS_SEED_GROUPS))
}

export function getBroaderAtsJobUrls() {
  return dedupeUrls(flattenSeedGroups(BROADER_ATS_SEED_GROUPS))
}

export function getBalancedAtsJobUrls(options?: {
  includeBroader?: boolean
  maxPerPlatform?: number
}) {
  const includeBroader = options?.includeBroader ?? false
  const requestedMaxPerPlatform =
    options?.maxPerPlatform ?? DEFAULT_BALANCED_SEED_LIMIT_PER_PLATFORM
  const maxPerPlatform =
    requestedMaxPerPlatform > 0
      ? requestedMaxPerPlatform
      : DEFAULT_BALANCED_SEED_LIMIT_PER_PLATFORM
  const groups = includeBroader
    ? [...PRIORITIZED_ATS_SEED_GROUPS, ...BROADER_ATS_SEED_GROUPS]
    : PRIORITIZED_ATS_SEED_GROUPS
  const pooledUrls = new Map<SupportedAtsPlatform, string[]>()
  const platformOrder: SupportedAtsPlatform[] = []

  for (const group of groups) {
    const existing = pooledUrls.get(group.atsPlatform) ?? []
    pooledUrls.set(group.atsPlatform, [...existing, ...group.urls])

    if (!platformOrder.includes(group.atsPlatform)) {
      platformOrder.push(group.atsPlatform)
    }
  }

  const limitedUrls = new Map<SupportedAtsPlatform, string[]>()

  for (const [platform, urls] of pooledUrls) {
    limitedUrls.set(platform, dedupeUrls(urls).slice(0, maxPerPlatform))
  }

  const selectedUrls: string[] = []
  const maxRounds = Math.max(
    0,
    ...Array.from(limitedUrls.values(), (urls) => urls.length),
  )

  for (let index = 0; index < maxRounds; index += 1) {
    for (const platform of platformOrder) {
      const urls = limitedUrls.get(platform) ?? []
      const url = urls[index]

      if (url) {
        selectedUrls.push(url)
      }
    }
  }

  return dedupeUrls(selectedUrls)
}
