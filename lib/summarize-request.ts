const OPENAI_MODEL = process.env.OPENAI_SUMMARY_MODEL ?? 'gpt-4.1-mini'

type OpenAIResponse = {
  output_text?: string
  output?: Array<{
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

function getFallbackSummaryFromOutput(data: OpenAIResponse): string {
  const textFromOutput = data.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === 'output_text' && typeof content.text === 'string')
    ?.text

  return textFromOutput?.trim() ?? ''
}

export async function summarizeRequest(requestText: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  const inputText = requestText.trim()

  if (!apiKey || !inputText) {
    return null
  }

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
            `You are an intelligent assistant that helps users understand their situation clearly and calmly.

Analyze the user's input and return a structured response.

IMPORTANT:
- Do NOT return JSON as a string
- Return ONLY valid JSON
- No explanations outside JSON

Format:

{
  "summary": "Rewrite the situation clearly in 1-2 sentences, natural and human. Do not mention 'user' or 'request'. Speak directly about the situation.",
  "category": "Short label like Work, Relationships, Health, Personal",
  "priority": "low | medium | high",
  "action_items": [
    "Clear, practical next step",
    "Another helpful step if needed"
  ]
}

Guidelines:

- Summary should feel like you're explaining the situation to a smart friend
- Avoid robotic phrases like 'user submitted'
- Be calm, clear, and grounded
- Action items should feel useful, not generic`,
        },
        {
          role: 'user',
          content: `Input:\n${inputText}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`OpenAI summary failed (${response.status}): ${details}`)
  }

  const data = (await response.json()) as OpenAIResponse
  const summary = data.output_text?.trim() || getFallbackSummaryFromOutput(data)

  return summary || null
}
