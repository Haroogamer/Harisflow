import type { CrawlableJobSource } from '@/lib/job-hunter/crawlers/registry'
import {
  DEFAULT_BALANCED_SEED_LIMIT_PER_PLATFORM,
  getBalancedAtsJobUrls,
} from '@/lib/job-hunter/discovery-providers/search'
import { analyzeJobSourceUrl } from '@/lib/job-hunter/source-analyzer'

function buildDiscoverySources(): CrawlableJobSource[] {
  const discoverySources = new Map<string, CrawlableJobSource>()

  for (const url of getBalancedAtsJobUrls({
    includeBroader: true,
    maxPerPlatform: DEFAULT_BALANCED_SEED_LIMIT_PER_PLATFORM,
  })) {
    const candidate = analyzeJobSourceUrl(url)

    if (!candidate) {
      continue
    }

    discoverySources.set(candidate.careers_url, {
      company: candidate.company,
      baseUrl: candidate.careers_url,
      ats_platform: candidate.ats_platform,
    })
  }

  return Array.from(discoverySources.values())
}

export type DiscoverySource = CrawlableJobSource

export const DISCOVERY_SOURCES: DiscoverySource[] = buildDiscoverySources()
