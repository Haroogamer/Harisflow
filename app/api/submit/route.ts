import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { summarizeRequest } from '@/lib/summarize-request'

type SubmitBody = {
  request?: string
}

type StructuredAIResponse = {
  summary: string
  category: string
  priority: string
  action_items: string[]
}

function parseJsonCandidate(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()

  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const candidates = [trimmed, withoutFences]

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // Not valid JSON candidate.
    }
  }

  return null
}

function getStringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function getActionItems(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()]
  }

  return []
}

function mapAIResponse(raw: string | null, requestText: string): StructuredAIResponse {
  const parsed = raw ? parseJsonCandidate(raw) : null
  const fallbackSummary = raw?.trim() || requestText

  const summary = getStringField(parsed?.summary) ?? fallbackSummary
  const category = getStringField(parsed?.category) ?? 'general'
  const priority = getStringField(parsed?.priority) ?? 'medium'
  const actionItemsFromPrimary = getActionItems(parsed?.action_items)
  const actionItemsFromAlt = getActionItems(parsed?.actionItems)
  const actionItemsFromFallback = getActionItems(parsed?.actions)
  const actionItems =
    actionItemsFromPrimary.length > 0
      ? actionItemsFromPrimary
      : actionItemsFromAlt.length > 0
        ? actionItemsFromAlt
        : actionItemsFromFallback

  return {
    summary,
    category,
    priority,
    action_items: actionItems,
  }
}

export async function POST(req: Request) {
  let body: SubmitBody
  try {
    body = (await req.json()) as SubmitBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const request = body.request?.trim() ?? ''

  if (!request) {
    return NextResponse.json({ error: 'Request is required' }, { status: 400 })
  }

  let aiRaw: string | null = null
  try {
    aiRaw = await summarizeRequest(request)
  } catch (error) {
    console.error('OPENAI SUMMARY ERROR:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }

  const mapped = mapAIResponse(aiRaw, request)

  const { error } = await supabase
    .from('submissions')
    .insert([
      {
        name: null,
        email: null,
        request,
        summary: mapped.summary,
        status: 'new',
      },
    ])

  if (error) {
    console.error('SUPABASE ERROR:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json(mapped)
}
