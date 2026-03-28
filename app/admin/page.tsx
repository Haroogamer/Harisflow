import { supabase } from '@/lib/supabase'

export default async function AdminPage() {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div>Error loading data</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Submissions</h1>

      {data?.map((item) => (
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