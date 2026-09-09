import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase-types'

type SupabaseClientInstance = SupabaseClient<Database>

let supabaseInstance: SupabaseClientInstance | undefined

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.')
  }

  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required.')
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

export function getSupabase() {
  supabaseInstance ??= createSupabaseClient()
  return supabaseInstance
}

export const supabase = new Proxy({} as SupabaseClientInstance, {
  get(_target, property) {
    const client = getSupabase()
    const value = Reflect.get(client, property)

    return typeof value === 'function' ? value.bind(client) : value
  },
})