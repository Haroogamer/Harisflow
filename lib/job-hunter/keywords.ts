export const SERVICE_NOW_KEYWORDS = [
  'ServiceNow',
  'Senior ServiceNow Developer',
  'ServiceNow Developer',
  'Lead ServiceNow Developer',
  'ServiceNow Engineer',
  'ServiceNow Consultant',
  'ServiceNow Architect',
  'ServiceNow Administrator',
  'ServiceNow Integration',
  'ServiceNow Platform Engineer',
  'ITSM',
  'ITOM',
  'CMDB',
  'Discovery',
  'Event Management',
  'Flow Designer',
  'IntegrationHub',
]

export const REMOTE_LOCATIONS = [
  'Remote',
  'United States',
  'Atlanta, GA',
  'Chicago, IL',
  'Dallas, TX',
  'New York, NY',
  'Virginia',
  'Washington, DC',
]

type KeywordMatchJob = {
  title?: string | null
  description?: string | null
}

export function jobMatchesKeywords(job: KeywordMatchJob) {
  const title = job.title?.toLowerCase() ?? ''
  const description = job.description?.toLowerCase() ?? ''

  return SERVICE_NOW_KEYWORDS.some((keyword) => {
    const normalizedKeyword = keyword.toLowerCase()

    return (
      title.includes(normalizedKeyword) ||
      description.includes(normalizedKeyword)
    )
  })
}
