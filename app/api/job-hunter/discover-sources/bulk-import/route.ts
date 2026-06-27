import { NextResponse } from 'next/server'
import {
  analyzeJobSourceUrl,
  normalizeJobSourceCareersUrl,
} from '@/lib/job-hunter/source-analyzer'
import { supabaseAdmin } from '@/lib/supabase-admin'

type BulkImportRequestBody = {
  urls?: unknown
}

type BulkImportRowResult = {
  company: string
  ats_platform: string
  careers_url: string
  reason: string
}

type BulkImportError = {
  url: string
  error: string
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  return Boolean(
    cronSecret && authorization === `Bearer ${cronSecret}`,
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

function buildNotes(source: ReturnType<typeof analyzeJobSourceUrl>) {
  if (!source) {
    return ''
  }

  return [
    source.notes,
    `Original URL: ${source.original_url}`,
    `Discovery confidence: ${source.confidence}`,
  ].join('\n')
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: BulkImportRequestBody

  try {
    body = (await request.json()) as BulkImportRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    !Array.isArray(body.urls) ||
    !body.urls.every((url) => typeof url === 'string')
  ) {
    return NextResponse.json(
      { error: 'Expected JSON body with urls: string[]' },
      { status: 400 },
    )
  }

  let inserted = 0
  let skipped = 0
  let failed = 0
  const insertedRows: BulkImportRowResult[] = []
  const skippedRows: BulkImportRowResult[] = []
  const errors: BulkImportError[] = []

  for (const url of body.urls) {
    try {
      const source = analyzeJobSourceUrl(url)

      if (!source) {
        failed += 1
        errors.push({
          url,
          error: 'Unsupported or invalid job source URL',
        })
        continue
      }

      const normalizedCareersUrl = normalizeJobSourceCareersUrl(
        source.careers_url,
      )

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
          ats_platform: source.ats_platform,
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
        .select('company, ats_platform, careers_url')
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
        ats_platform: insertedSource.ats_platform,
        careers_url: insertedSource.careers_url,
        reason: 'Inserted new source',
      })
    } catch (error) {
      failed += 1
      errors.push({
        url,
        error: serializeError(error),
      })
    }
  }

  return NextResponse.json({
    total: body.urls.length,
    inserted,
    skipped,
    failed,
    insertedRows,
    skippedRows,
    errors,
  })
}