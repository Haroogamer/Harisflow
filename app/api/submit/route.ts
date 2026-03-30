import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { summarizeRequest } from '@/lib/summarize-request'

type SubmitBody = {
  name?: string
  email?: string
  request?: string
}

export async function POST(req: Request) {
  const body = (await req.json()) as SubmitBody
  const name = body.name?.trim() ?? ''
  const email = body.email?.trim() ?? ''
  const request = body.request?.trim() ?? ''

  if (!name || !email || !request) {
    return NextResponse.json({ error: 'Name, email, and request are required' }, { status: 400 })
  }

  let summary: string | null = null
  try {
    summary = await summarizeRequest(request)
  } catch (error) {
    console.error('OPENAI SUMMARY ERROR:', error)
  }

  const { error } = await supabase
    .from('submissions')
    .insert([{ name, email, request, summary }])

  if (error) {
    console.error('SUPABASE ERROR:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Success' })
}
