import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { summarizeRequest } from '@/lib/summarize-request'
import { type AIResponse } from '@/lib/ai-response'

type SubmitBody = {
  request?: string
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

  const goal =
    typeof parsed.goal === 'string' && parsed.goal.trim()
      ? parsed.goal.trim()
      : null
  const constraintsRaw = parsed.constraints
  const constraints =
    Array.isArray(constraintsRaw) &&
    constraintsRaw.every((item) => typeof item === 'string')
      ? constraintsRaw.map((item) => item.trim()).filter(Boolean)
      : null
  const optionsRaw = parsed.options
  const options =
    Array.isArray(optionsRaw) &&
    optionsRaw.every((item) => typeof item === 'string')
      ? optionsRaw.map((item) => item.trim()).filter(Boolean)
      : null
  const nextStep =
    typeof parsed.next_step === 'string' && parsed.next_step.trim()
      ? parsed.next_step.trim()
      : null

  if (
    !goal ||
    !constraints ||
    constraints.length === 0 ||
    !options ||
    options.length < 2 ||
    options.length > 3 ||
    !nextStep
  ) {
    throw new Error('Invalid AI JSON response')
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
        summary: parsedAIResponse.goal,
        status: 'new',
      },
    ])

  if (error) {
    console.error('SUPABASE ERROR:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json(parsedAIResponse)
}
