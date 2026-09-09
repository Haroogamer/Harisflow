import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase-types'

type SupabaseAdminClient = SupabaseClient<Database>

let supabaseAdminInstance: SupabaseAdminClient | undefined

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.')
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey)
}

export function getSupabaseAdmin() {
  supabaseAdminInstance ??= createSupabaseAdminClient()
  return supabaseAdminInstance
}

export const supabaseAdmin = new Proxy({} as SupabaseAdminClient, {
  get(_target, property) {
    const client = getSupabaseAdmin()
    const value = Reflect.get(client, property)

    return typeof value === 'function' ? value.bind(client) : value
  },
})
