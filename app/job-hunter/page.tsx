'use client'

import { useEffect, useState } from 'react'
import type { JobHunterJob } from '@/lib/job-hunter/job-types'

function formatDate(value: string | null) {
  if (!value) {
    return 'Unknown'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export default function JobHunterPage() {
  const [jobs, setJobs] = useState<JobHunterJob[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await fetch('/api/job-hunter/jobs')
        const data: unknown = await response.json()

        if (!response.ok) {
          const message =
            typeof data === 'object' &&
            data !== null &&
            'error' in data &&
            typeof data.error === 'string'
              ? data.error
              : 'Failed to load jobs'

          throw new Error(message)
        }

        const loadedJobs =
          typeof data === 'object' &&
          data !== null &&
          'jobs' in data &&
          Array.isArray(data.jobs)
            ? data.jobs
            : []

        setJobs(loadedJobs)
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load jobs',
        )
      }
    }

    loadJobs()
  }, [])

  return (
    <main style={{ padding: '20px' }}>
      <h1>Job Hunter</h1>

      {error ? <p>{error}</p> : null}

      {jobs.map((job) => (
        <div
          key={job.id}
          style={{
            border: '1px solid #ccc',
            padding: '10px',
            marginBottom: '10px',
          }}
        >
          <h2>{job.title}</h2>
          <p><strong>Company:</strong> {job.company}</p>
          <p><strong>Location:</strong> {job.location}</p>
          <p><strong>ATS Platform:</strong> {job.ats_platform}</p>
          <p><strong>Status:</strong> {job.status}</p>
          <p>
            <strong>Freshness:</strong>{' '}
            {formatDate(job.date_posted ?? job.date_discovered)}
          </p>
          <p><strong>Date Posted:</strong> {formatDate(job.date_posted)}</p>
          <p><strong>Date Discovered:</strong> {formatDate(job.date_discovered)}</p>
          <a href={job.job_url} target="_blank" rel="noreferrer">
            Apply
          </a>
        </div>
      ))}
    </main>
  )
}
