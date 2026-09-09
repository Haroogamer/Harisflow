export const dynamic = 'force-dynamic'
export const revalidate = 0
import { supabase } from '@/lib/supabase'

type SubmissionRow = {
  id: string
  name: string | null
  email: string | null
  request: string | null
  summary: string | null
  status: string | null
}

export default async function AdminPage() {
  const { data, error } = await supabase
  .from('submissions')
  .select('*')
  .order('created_at', { ascending: false })
  .throwOnError()

  const submissions = (data ?? []) as SubmissionRow[]

  if (error) {
    return <div>Error loading data</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Submissions</h1>

      {submissions.map((item) => (
        <div
          key={item.id}
          style={{
            border: '1px solid #ccc',
            padding: '10px',
            marginBottom: '10px',
          }}
        >
          <p><strong>Name:</strong> {item.name}</p>
          <p><strong>Email:</strong> {item.email}</p>
          <p><strong>Request:</strong> {item.request}</p>
          <p><strong>Summary:</strong> {item.summary ?? 'No summary'}</p>
          <p><strong>Status:</strong> {item.status}</p>

          <form action="/api/update-status" method="POST">
            <input type="hidden" name="id" value={item.id} />
            <button type="submit">Mark as Completed</button>
          </form>
        </div>
      ))}
    </div>
  )
}
