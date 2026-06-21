import type { JobHunterJob } from '@/lib/job-hunter/job-types'

type DiscordJob = Pick<
  JobHunterJob,
  | 'company'
  | 'title'
  | 'location'
  | 'ats_platform'
  | 'date_discovered'
  | 'job_url'
>

export type DiscordNotificationResult =
  | { sent: true }
  | { sent: false; reason: string }

function formatField(value: string | null | undefined) {
  return value?.trim() || 'Unknown'
}

function serializeDiscordError(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export async function sendDiscordNotification(
  job: DiscordJob,
): Promise<DiscordNotificationResult> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL

  if (!webhookUrl) {
    return { sent: false, reason: 'Missing DISCORD_WEBHOOK_URL' }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: formatField(job.title),
            url: job.job_url || undefined,
            description: `New job discovered at ${formatField(job.company)}`,
            color: 0x2f80ed,
            fields: [
              {
                name: 'Company',
                value: formatField(job.company),
                inline: true,
              },
              {
                name: 'Title',
                value: formatField(job.title),
                inline: true,
              },
              {
                name: 'Location',
                value: formatField(job.location),
                inline: true,
              },
              {
                name: 'ATS Platform',
                value: formatField(job.ats_platform),
                inline: true,
              },
              {
                name: 'Date Discovered',
                value: formatField(job.date_discovered),
                inline: true,
              },
              {
                name: 'Job URL',
                value: formatField(job.job_url),
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()

      return {
        sent: false,
        reason: `Discord webhook failed with status ${response.status}: ${responseText}`,
      }
    }

    return { sent: true }
  } catch (error) {
    return { sent: false, reason: serializeDiscordError(error) }
  }
}
