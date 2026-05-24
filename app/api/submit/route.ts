import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { summarizeRequest } from '@/lib/summarize-request'
import { type AIResponse } from '@/lib/ai-response'

type SubmitBody = {
  request?: string
}

function parseAndValidateAIResponse(content: string): AIResponse {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    console.error('AI validation failure:', 'Response was not valid JSON')
    throw new Error('AI response was not valid JSON')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.error('AI validation failure:', 'Response was not a JSON object')
    throw new Error('AI response was not a JSON object')
  }

  console.log('Parsed AI object:', parsed)

  const responseObject = parsed as Record<string, unknown>
  const goal =
    typeof responseObject.goal === 'string' ? responseObject.goal.trim() : ''
  const constraints = Array.isArray(responseObject.constraints)
    ? responseObject.constraints
        .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
        .map((item) => item.trim())
    : []
  const options = Array.isArray(responseObject.options)
    ? responseObject.options
        .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
        .map((item) => item.trim())
    : []
  const nextStep =
    typeof responseObject.next_step === 'string'
      ? responseObject.next_step.trim()
      : ''

  if (!goal) {
    console.error('AI validation failure:', 'Missing non-empty goal')
    throw new Error('AI response is missing a non-empty goal')
  }

  if (!nextStep) {
    console.error('AI validation failure:', 'Missing non-empty next_step')
    throw new Error('AI response is missing a non-empty next_step')
  }

  return {
    goal,
    constraints,
    options,
    next_step: nextStep,
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
    console.log('Raw AI content:', content)
    parsedAIResponse = parseAndValidateAIResponse(content)
  } catch (error) {
    console.error('OPENAI SUMMARY ERROR:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to process request'

    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { error } = await supabase
    .from('submissions')
    .insert([
      {
        name: null,
        email: null,
        request,
        summary: parsedAIResponse.goal,
        status: 'new',
      },
    ])

  if (error) {
    console.error('SUPABASE ERROR:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({
    goal: parsedAIResponse.goal,
    constraints: parsedAIResponse.constraints,
    options: parsedAIResponse.options,
    next_step: parsedAIResponse.next_step,
  })
}
