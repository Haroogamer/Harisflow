const OPENAI_MODEL = process.env.OPENAI_MESSAGE_MODEL ?? 'gpt-4.1-mini'

type GenerateMessageBody = {
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
    return new Response('Invalid JSON body', { status: 400 })
  }

  const summary = body.summary?.trim() ?? ''
  const actionItems = Array.isArray(body.action_items)
    ? body.action_items.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : null

  if (!summary || !actionItems || actionItems.length === 0) {
    return new Response('summary and action_items are required', { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response('Server is not configured', { status: 500 })
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
        text: {
          format: {
            type: 'text',
          },
        },
        input: [
          {
            role: 'system',
            content: `You are helping someone communicate clearly and confidently.

Given the situation and next steps, write a message they can send.

- Tone: natural, calm, human
- Avoid robotic language
- Be direct and clear
- Do not mention AI
- Output only the message`,
          },
          {
            role: 'user',
            content: `Situation:\n${summary}\n\nNext steps:\n${actionItems.map((item) => `- ${item}`).join('\n')}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const details = await response.text()
      console.error('OPENAI GENERATE MESSAGE ERROR:', details)
      return new Response('Failed to generate message', { status: 500 })
    }

    const data = (await response.json()) as OpenAIResponse
    const message = data.output_text?.trim() || getFallbackTextFromOutput(data)

    if (!message) {
      return new Response('Failed to generate message', { status: 500 })
    }

    return new Response(message, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('GENERATE MESSAGE ROUTE ERROR:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
