import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { summarizeRequest } from '@/lib/summarize-request'

type SubmitBody = {
  request?: string
}

type AIResponse = {
  summary: string
  category: string
  priority: string
  action_items: string[]
}

function parseAndValidateAIResponse(content: string): AIResponse {
  let parsed: AIResponse
  try {
    parsed = JSON.parse(content) as AIResponse
  } catch {
    throw new Error('Invalid AI JSON response')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid AI JSON response')
  }

  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : null
  const category =
    typeof parsed.category === 'string' && parsed.category.trim()
      ? parsed.category.trim()
      : null
  const priority =
    typeof parsed.priority === 'string' && parsed.priority.trim()
      ? parsed.priority.trim()
      : null
  const actionItemsRaw = parsed.action_items
  const actionItems =
    Array.isArray(actionItemsRaw) &&
    actionItemsRaw.every((item) => typeof item === 'string')
      ? actionItemsRaw.map((item) => item.trim()).filter(Boolean)
      : null

  if (!summary || !category || !priority || !actionItems) {
    throw new Error('Invalid AI JSON response')
  }

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

  const request = body.request

  if (!request || typeof request !== 'string' || !request.trim()) {
    return NextResponse.json({ error: 'Request is required' }, { status: 400 })
  }

  console.log('Incoming request:', request)

  let parsedAIResponse: AIResponse
  try {
    const aiResponse = await summarizeRequest(request)
    const content = aiResponse?.trim() ?? ''
    parsedAIResponse = parseAndValidateAIResponse(content)
  } catch (error) {
    console.error('OPENAI SUMMARY ERROR:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }

  const { error } = await supabase
    .from('submissions')
    .insert([
      {
        name: null,
        email: null,
        request,
        summary: parsedAIResponse.summary,
        status: 'new',
      },
    ])

  if (error) {
    console.error('SUPABASE ERROR:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json(parsedAIResponse)
}
