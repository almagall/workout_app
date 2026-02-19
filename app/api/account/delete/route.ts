import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Delete in dependency order: children first, then parents.
    // exercise_logs cascade from workout_sessions, template_exercises/template_days
    // cascade from workout_templates, so deleting the parents is enough for those.
    // All other tables need explicit deletion.

    const tables: { table: string; column: string }[] = [
      { table: 'accountability_pairs', column: 'requester_id' },
      { table: 'accountability_pairs', column: 'partner_id' },
      { table: 'challenges', column: 'challenger_id' },
      { table: 'challenges', column: 'challenged_id' },
      { table: 'pr_comments', column: 'from_user_id' },
      { table: 'pr_comments', column: 'to_user_id' },
      { table: 'pr_reactions', column: 'from_user_id' },
      { table: 'pr_reactions', column: 'to_user_id' },
      { table: 'notifications', column: 'user_id' },
      { table: 'notifications', column: 'from_user_id' },
      { table: 'friend_requests', column: 'from_user_id' },
      { table: 'friend_requests', column: 'to_user_id' },
      { table: 'user_achievements', column: 'user_id' },
      { table: 'bodyweight_history', column: 'user_id' },
      { table: 'workout_sessions', column: 'user_id' },
      { table: 'progressive_overload_settings', column: 'user_id' },
      { table: 'workout_templates', column: 'user_id' },
      { table: 'simple_users', column: 'user_id' },
    ]

    const errors: string[] = []

    for (const { table, column } of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(column, userId)

      if (error) {
        errors.push(`${table}.${column}: ${error.message}`)
      }
    }

    if (errors.length > 0) {
      console.error('Account deletion partial errors:', errors)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Account deletion failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
