export type CrawlOptions = {
  maxAgeDays?: number
}

export function isJobRecent(
  dateValue: string | number | null | undefined,
  maxAgeDays: number,
) {
  // Treat a missing date as recent so jobs without publish dates aren't
  // silently dropped — the keyword filter will still evaluate them.
  if (!dateValue) return true

  const date = new Date(dateValue)

  // Treat an unparseable date as recent for the same reason: better to
  // include a borderline job than to miss a legitimate one.
  if (isNaN(date.getTime())) return true

  const cutoff = new Date()

  cutoff.setDate(cutoff.getDate() - maxAgeDays)

  return date >= cutoff
}
