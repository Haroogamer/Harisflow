import {
  analyzeJobSourceUrl,
  type JobSourceCandidate,
} from '@/lib/job-hunter/source-analyzer'

export function discoverFromManualUrls(urls: string[]) {
  const candidates = new Map<string, JobSourceCandidate>()

  for (const url of urls) {
    const candidate = analyzeJobSourceUrl(url)

    if (candidate) {
      candidates.set(candidate.careers_url, candidate)
    }
  }

  return Array.from(candidates.values())
}
