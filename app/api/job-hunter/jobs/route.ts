import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const jobs = [...(data ?? [])].sort((left, right) => {
    const leftFreshness = new Date(
      left.date_posted ?? left.date_discovered ?? 0,
    ).getTime()
    const rightFreshness = new Date(
      right.date_posted ?? right.date_discovered ?? 0,
    ).getTime()

    if (rightFreshness !== leftFreshness) {
      return rightFreshness - leftFreshness
    }

    return (
      new Date(right.date_discovered ?? 0).getTime() -
      new Date(left.date_discovered ?? 0).getTime()
    )
  })

  return NextResponse.json({ jobs })
}
