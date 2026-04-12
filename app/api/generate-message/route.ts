import { NextResponse } from 'next/server'

const OPENAI_MODEL = process.env.OPENAI_MESSAGE_MODEL ?? 'gpt-4.1-mini'

type GenerateMessageBody = {
  request?: string
  summary?: string
  action_items?: string[]
}

type OpenAIResponse = {
  output_text?: string
  output?: Array<{
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

function getFallbackTextFromOutput(data: OpenAIResponse): string {
  const textFromOutput = data.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === 'output_text' && typeof content.text === 'string')
    ?.text

  return textFromOutput?.trim() ?? ''
}

export async function POST(req: Request) {
  let body: GenerateMessageBody
  try {
    body = (await req.json()) as GenerateMessageBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const requestText = body.request?.trim() ?? ''
  const summary = body.summary?.trim() ?? ''
  const actionItems = Array.isArray(body.action_items)
    ? body.action_items.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : null

  if (!requestText || !summary || !actionItems) {
    return NextResponse.json(
      { error: 'request, summary, and action_items are required' },
      { status: 400 },
    )
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Server is not configured' }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_output_tokens: 220,
        input: [
          {
            role: 'system',
            content:
              'You write ready-to-send messages. Use a clear, calm, confident tone. Keep it concise and practical. Return only the message text with no markdown.',
          },
          {
            role: 'user',
            content: [
              'Write a ready-to-send message based on this context:',
              `Original request: ${requestText}`,
              `Summary: ${summary}`,
              actionItems.length > 0
                ? `Action items: ${actionItems.map((item) => `- ${item}`).join(' ')}`
                : 'Action items: none provided',
            ].join('\n'),
          },
        ],
      }),
    })

    if (!response.ok) {
      const details = await response.text()
      console.error('OPENAI GENERATE MESSAGE ERROR:', details)
      return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 })
    }

    const data = (await response.json()) as OpenAIResponse
    const message = data.output_text?.trim() || getFallbackTextFromOutput(data)

    if (!message) {
      return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('GENERATE MESSAGE ROUTE ERROR:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
