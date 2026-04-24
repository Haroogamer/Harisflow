const OPENAI_MODEL = process.env.OPENAI_MESSAGE_MODEL ?? 'gpt-4.1-mini'

type GenerateMessageBody = {
  goal?: string
  next_step?: string
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

  const goal = body.goal?.trim() ?? ''
  const nextStep = body.next_step?.trim() ?? ''

  if (!goal || !nextStep) {
    return new Response('goal and next_step are required', { status: 400 })
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
            content: `You are helping someone communicate clearly.

Given the goal and next step, write a message they can send.

- Tone: direct, concise, practical
- Be direct and clear
- Do not mention AI
- Output only the message`,
          },
          {
            role: 'user',
            content: `Goal:\n${goal}\n\nNext step:\n${nextStep}`,
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
