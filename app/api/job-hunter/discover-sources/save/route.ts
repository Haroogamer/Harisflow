import { NextResponse } from 'next/server'
import { normalizeJobSourceCareersUrl } from '@/lib/job-hunter/source-analyzer'
import { supabaseAdmin } from '@/lib/supabase-admin'

type SourceCandidate = {
  company?: unknown
  ats_platform?: unknown
  careers_url?: unknown
  original_url?: unknown
  confidence?: unknown
  notes?: unknown
}

type SaveDiscoveredSourcesRequestBody = {
  sources?: unknown
}

type SaveError = {
  careers_url: string
  error: string
}

type SavedRowResult = {
  company: string
  careers_url: string
  reason: string
}

type SaveWarning = {
  company: string
  careers_url: string
  warning: string
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  return Boolean(
    cronSecret && authorization === `Bearer ${cronSecret}`,
  )
}

function isSourceCandidate(value: unknown): value is SourceCandidate {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as SourceCandidate

  return (
    typeof candidate.company === 'string' &&
    typeof candidate.ats_platform === 'string' &&
    typeof candidate.careers_url === 'string'
  )
}

function serializeError(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function getUrlHost(value: string) {
  return new URL(value).hostname.toLowerCase()
}

function getCompanyTokens(company: string) {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((token) => token.length >= 3)
}

function companyMayMatchHost(company: string, careersUrl: string) {
  const host = getUrlHost(careersUrl).replace(/[^a-z0-9]+/g, '')
  const tokens = getCompanyTokens(company)

  return tokens.length === 0 || tokens.some((token) => host.includes(token))
}

function buildNotes(source: SourceCandidate) {
  const notes = typeof source.notes === 'string' ? source.notes.trim() : ''
  const originalUrl =
    typeof source.original_url === 'string' ? source.original_url.trim() : ''
  const confidence =
    source.confidence === undefined || source.confidence === null
      ? ''
      : String(source.confidence)

  return [
    notes,
    originalUrl ? `Original URL: ${originalUrl}` : null,
    confidence ? `Discovery confidence: ${confidence}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: SaveDiscoveredSourcesRequestBody

  try {
    body = (await request.json()) as SaveDiscoveredSourcesRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body.sources)) {
    return NextResponse.json(
      { error: 'Expected JSON body with sources: SourceCandidate[]' },
      { status: 400 },
    )
  }

  let inserted = 0
  let skipped = 0
  let failed = 0
  const errors: SaveError[] = []
  const warnings: SaveWarning[] = []
  const insertedRows: SavedRowResult[] = []
  const skippedRows: SavedRowResult[] = []

  for (const source of body.sources) {
    if (!isSourceCandidate(source)) {
      failed += 1
      errors.push({
        careers_url: 'unknown',
        error: 'Invalid source candidate',
      })
      continue
    }

    try {
      const normalizedCareersUrl = normalizeJobSourceCareersUrl(
        source.careers_url,
      )

      if (!companyMayMatchHost(source.company, normalizedCareersUrl)) {
        warnings.push({
          company: source.company,
          careers_url: normalizedCareersUrl,
          warning: 'Company name may not match URL host',
        })
      }

      const { data: existingSource, error: lookupError } = await supabaseAdmin
        .from('job_sources')
        .select('id')
        .eq('careers_url', normalizedCareersUrl)
        .limit(1)
        .maybeSingle()

      if (lookupError) {
        throw lookupError
      }

      if (existingSource) {
        skipped += 1
        skippedRows.push({
          company: source.company,
          careers_url: normalizedCareersUrl,
          reason: 'Duplicate careers_url',
        })
        continue
      }

      const { data: insertedSource, error: insertError } = await supabaseAdmin
        .from('job_sources')
        .insert({
          company: source.company,
          ats_platform: source.ats_platform,
          careers_url: normalizedCareersUrl,
          enabled: true,
          source_status: 'active',
          crawl_interval_minutes: 30,
          failure_count: 0,
          notes: buildNotes(source),
        })
        .select('company, careers_url')
        .single()

      if (insertError) {
        throw insertError
      }

      if (!insertedSource) {
        throw new Error('Insert succeeded but no row was returned')
      }

      inserted += 1
      insertedRows.push({
        company: insertedSource.company,
        careers_url: insertedSource.careers_url,
        reason: 'Inserted new source',
      })
    } catch (error) {
      failed += 1
      errors.push({
        careers_url:
          typeof source.careers_url === 'string'
            ? source.careers_url.trim()
            : 'unknown',
        error: serializeError(error),
      })
    }
  }

  return NextResponse.json({
    inserted,
    skipped,
    failed,
    insertedRows,
    skippedRows,
    warnings,
    errors,
  })
}
