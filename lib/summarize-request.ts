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
  "summary": "Write a 1-2 sentence insight about the underlying tension or goal. Do not restate the user's idea directly. Sound natural and human, grounded and specific. Avoid robotic framing, generic filler, and phrases like 'you are dealing with'.",
  "state": "Choose ONE dominant state: confused | overwhelmed | stuck | overthinking | avoidant",
  "key_points": [
    "Sharp observation on the core issue",
    "Sharp observation on the main constraint",
    "Sharp observation on the decision pressure"
  ],
  "action_items": [
    "Specific, immediately executable next step",
    "Another concrete step if needed"
  ]
}

Guidelines:

- Summary should feel like a real person explaining the situation clearly
- Style should be conversational but sharp
- Keep summary concise and readable (1-2 sentences max)
- Avoid robotic phrases like 'user submitted' or 'you are dealing with'
- Avoid generic framing and vague language
- Do not mirror or paraphrase the user's wording line-by-line
- Focus the summary on the underlying tension, tradeoff, or goal
- Make it feel like insight, not description
- Be calm, clear, grounded, and specific
- state must be exactly one value from: confused, overwhelmed, stuck, overthinking, avoidant
- Choose only ONE dominant state
- State should reflect the user's internal situation (how they are mentally/emotionally approaching the problem), not the topic itself
- key_points must be 2-3 short, concrete bullets that explain:
  1) the core issue, 2) the main constraint, 3) the decision pressure
- Write each key point like a sharp observation, not a label
- Avoid templated phrases like 'the core challenge is'
- Keep key_points short, punchy, and specific
- Each key point should surface something the user likely hasn't fully named yet
- Action items must be specific and concrete
- Each action item should be immediately executable
- Avoid generic advice like 'research' or 'consider'
- Prefer clear verbs and real-world steps over abstract suggestions
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
