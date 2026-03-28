import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const formData = await req.formData()

  const id = formData.get('id')

  const { error } = await supabase
    .from('submissions')
    .update({ status: 'completed' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.redirect('http://localhost:3000/admin')
}