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
      max_output_tokens: 80,
      input: [
        {
          role: 'system',
          content:
            'You are an intake analysis assistant for a SaaS application. Your job is to analyze a user submission and return a structured result for internal business use. You must: 1. Summarize the request clearly and briefly 2. Classify the request into a category 3. Assign a priority 4. Extract any important action items or missing information 5. Return output in valid JSON only Rules: - Do not include markdown - Do not include explanations outside the JSON - Be concise and consistent - Base your answer only on the provided input - If information is missing, say so in the "missing_information" field - Do not invent facts',
        },
        {
          role: 'user',
          content:  "Summarize the following request in ONE clear sentence. Do not ask questions. Do not add suggestions. Only describe what the user needs.\n\nRequest:"+inputText,
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
