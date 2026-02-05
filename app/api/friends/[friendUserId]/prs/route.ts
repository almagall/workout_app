import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeRecentPRsFromData } from '@/lib/pr-helper'
import type { RecentPR } from '@/lib/pr-helper'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  return createClient(url, key)
}

/** GET /api/friends/[friendUserId]/prs?currentUserId=...&limit=5
 * Returns recent PRs for friendUserId if currentUserId is friends with them and friend allows it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ friendUserId: string }> }
) {
  try {
    const { friendUserId } = await params
    const currentUserId = request.nextUrl.searchParams.get('currentUserId')
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 10, 20)

    if (!currentUserId || !friendUserId) {
      return NextResponse.json({ error: 'Missing currentUserId or friendUserId' }, { status: 400 })
    }
    if (currentUserId === friendUserId) {
      return NextResponse.json({ error: 'Cannot view own PRs via this endpoint' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: friendRow } = await supabase
      .from('simple_users')
      .select('allow_friends_see_prs')
      .eq('user_id', friendUserId)
      .single()

    const allowPRs = friendRow?.allow_friends_see_prs !== false

    if (!allowPRs) {
      return NextResponse.json({ error: 'This user does not share PRs with friends' }, { status: 403 })
    }

    const { data: fr } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('status', 'accepted')
      .or(
        `and(from_user_id.eq.${currentUserId},to_user_id.eq.${friendUserId}),and(from_user_id.eq.${friendUserId},to_user_id.eq.${currentUserId})`
      )
      .limit(1)
      .single()

    if (!fr) {
      return NextResponse.json({ error: 'Not friends with this user' }, { status: 403 })
    }

    const { data: sessions, error: sessionsErr } = await supabase
      .from('workout_sessions')
      .select('id, template_day_id, workout_date')
      .eq('user_id', friendUserId)
      .order('workout_date', { ascending: true })

    if (sessionsErr) {
      console.error('Error fetching friend sessions:', sessionsErr)
      return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
    }

    if (!sessions?.length) {
      return NextResponse.json({ prs: [] as RecentPR[] })
    }

    const sessionIds = sessions.map((s) => s.id)
    const { data: logs, error: logsErr } = await supabase
      .from('exercise_logs')
      .select('session_id, exercise_name, weight, reps, set_type')
      .in('session_id', sessionIds)

    if (logsErr) {
      console.error('Error fetching friend logs:', logsErr)
      return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
    }

    const prs = computeRecentPRsFromData(sessions, logs ?? [], limit)
    const dayIds = [...new Set(sessions.map((s) => s.template_day_id))]
    const { data: days } = await supabase
      .from('template_days')
      .select('id, day_label')
      .in('id', dayIds)
    const dayLabels: Record<string, string> = {}
    days?.forEach((d) => { dayLabels[d.id] = d.day_label })
    return NextResponse.json({ prs, dayLabels })
  } catch (e) {
    console.error('Friend PRs API error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
