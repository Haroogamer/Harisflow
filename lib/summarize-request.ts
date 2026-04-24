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
            `You are an analytical decision assistant.

Analyze the user's input and return a structured decision breakdown.

IMPORTANT:
- Do NOT return JSON as a string
- Return ONLY valid JSON
- No explanations outside JSON
- Do NOT use emotional or validating language
- Do NOT say "it sounds like", "you might feel", or similar phrases
- Use direct, structured, analytical language only

Format:

{
  "goal": "The user's main objective in one direct sentence.",
  "constraints": [
    "A real limiting factor such as time, money, uncertainty, access, risk, dependency, or missing information"
  ],
  "options": [
    "Concrete option 1",
    "Concrete option 2",
    "Concrete option 3"
  ],
  "next_step": "One clear next step the user should take first."
}

Guidelines:

- Extract the user's main goal
- Identify real constraints only; include uncertainty as a constraint when information is missing
- Provide 2-3 concrete options, not generic advice
- Provide exactly ONE clear next step
- Keep every field concise and specific
- Do not include emotional analysis
- Do not reassure, validate, or soften the answer
- Avoid generic phrases like "consider your options", "do more research", or "think about it"
- Prefer concrete verbs and measurable actions
- options must contain 2 or 3 items
- next_step must be one sentence`,
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
