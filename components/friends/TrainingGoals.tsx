'use client'

import { useEffect, useState } from 'react'
import {
  createGoal,
  getMyGoals,
  getFriendsGoals,
  markAchieved,
  deleteGoal,
  type TrainingGoal,
  type GoalType,
} from '@/lib/goals'

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  e1rm: 'e1RM target',
  weight: 'Lift weight',
  streak: 'Streak goal',
  custom: 'Custom goal',
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(targetDate: string | null): boolean {
  if (!targetDate) return false
  const [y, m, d] = targetDate.split('-').map(Number)
  return new Date(y, m - 1, d) < new Date(new Date().setHours(0, 0, 0, 0))
}

type FeedTab = 'mine' | 'friends'

export default function TrainingGoals() {
  const [tab, setTab] = useState<FeedTab>('mine')
  const [myGoals, setMyGoals] = useState<TrainingGoal[]>([])
  const [friendsGoals, setFriendsGoals] = useState<TrainingGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)

  // Create form
  const [title, setTitle] = useState('')
  const [exerciseName, setExerciseName] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [goalType, setGoalType] = useState<GoalType>('custom')
  const [targetDate, setTargetDate] = useState('')
  const [note, setNote] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    const [mine, friends] = await Promise.all([getMyGoals(), getFriendsGoals()])
    setMyGoals(mine)
    setFriendsGoals(friends)
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setTitle(''); setExerciseName(''); setTargetValue(''); setGoalType('custom')
    setTargetDate(''); setNote(''); setCreateError('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (!title.trim()) { setCreateError('Title is required'); return }
    setCreating(true)
    const res = await createGoal({
      title,
      exercise_name: exerciseName || undefined,
      target_value: targetValue ? parseFloat(targetValue) : undefined,
      goal_type: goalType,
      target_date: targetDate || undefined,
      note: note || undefined,
    })
    if (res.ok) {
      resetForm()
      setShowCreate(false)
      await load()
    } else {
      setCreateError(res.error ?? 'Failed to create goal')
    }
    setCreating(false)
  }

  const handleAchieve = async (goalId: string) => {
    if (actingId) return
    setActingId(goalId)
    await markAchieved(goalId)
    await load()
    setActingId(null)
  }

  const handleDelete = async (goalId: string) => {
    if (actingId) return
    setActingId(goalId)
    await deleteGoal(goalId)
    await load()
    setActingId(null)
  }

  const renderGoalCard = (goal: TrainingGoal, isOwn: boolean) => {
    const overdue = isOverdue(goal.target_date)
    return (
      <div
        key={goal.id}
        className={`rounded-xl p-3.5 border transition-colors ${
          goal.is_achieved
            ? 'bg-green-500/5 border-green-500/15'
            : 'bg-white/[0.02] border-white/[0.04]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Friend name (for friends tab) */}
            {!isOwn && goal.username && (
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-[9px] font-semibold text-foreground/70 shrink-0">
                  {goal.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-[11px] text-muted font-medium">{goal.username}</span>
              </div>
            )}

            {/* Title */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={`text-sm font-medium ${goal.is_achieved ? 'text-green-400 line-through decoration-green-400/50' : 'text-foreground'}`}>
                {goal.title}
              </p>
              {goal.is_achieved && (
                <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
                  Achieved
                </span>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
              <span className="text-[10px] text-muted/70">{GOAL_TYPE_LABELS[goal.goal_type]}</span>
              {goal.exercise_name && (
                <span className="text-[10px] text-accent-light/70">{goal.exercise_name}</span>
              )}
              {goal.target_value != null && (
                <span className="text-[10px] text-muted/70 tabular-nums">
                  Target: {goal.target_value}{goal.goal_type === 'streak' ? 'wk' : ' lbs'}
                </span>
              )}
              {goal.target_date && (
                <span className={`text-[10px] tabular-nums ${overdue && !goal.is_achieved ? 'text-red-400/80' : 'text-muted/70'}`}>
                  By {formatDate(goal.target_date)}{overdue && !goal.is_achieved ? ' (overdue)' : ''}
                </span>
              )}
            </div>

            {goal.note && (
              <p className="text-[11px] text-muted/60 italic mt-1 line-clamp-2">{goal.note}</p>
            )}
          </div>

          {/* Actions */}
          {isOwn && (
            <div className="flex items-center gap-1 shrink-0">
              {!goal.is_achieved && (
                <button
                  type="button"
                  onClick={() => handleAchieve(goal.id)}
                  disabled={actingId === goal.id}
                  title="Mark achieved"
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-muted hover:text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(goal.id)}
                disabled={actingId === goal.id}
                title="Delete goal"
                className="h-7 w-7 flex items-center justify-center rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-0.5 h-4 rounded-full bg-accent/50" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Training Goals</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="btn-primary text-xs px-3 py-1.5"
        >
          Add Goal
        </button>
      </div>

      <div className="rounded-2xl border border-white/[0.06] overflow-hidden relative" style={{ background: 'linear-gradient(180deg, rgba(19,19,22,0.95), rgba(13,13,16,0.98))', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        {/* Tab bar */}
        <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-1">
          {(['mine', 'friends'] as FeedTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-all ${tab === t ? 'bg-accent/15 text-accent-light border border-accent/20' : 'text-muted hover:text-foreground hover:bg-white/[0.03]'}`}
            >
              {t === 'mine' ? 'My Goals' : "Friends' Goals"}
            </button>
          ))}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : tab === 'mine' ? (
            <>
              {myGoals.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                  </div>
                  <p className="text-muted text-sm">No goals yet</p>
                  <p className="text-muted/60 text-xs mt-0.5">Set a training goal to share with friends</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myGoals.map(g => renderGoalCard(g, true))}
                </div>
              )}
            </>
          ) : (
            <>
              {friendsGoals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted text-sm">No friends&apos; goals yet</p>
                  <p className="text-muted/60 text-xs mt-0.5">Friends&apos; goals will appear here when they add them</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friendsGoals.map(g => renderGoalCard(g, false))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create goal modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => { setShowCreate(false); resetForm() }}>
          <div className="modal-glass max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4, #2563eb)' }} />
            <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-foreground">New Training Goal</h3>
                <p className="text-xs text-muted mt-0.5">Set a goal to share with your friends</p>
              </div>
              <button type="button" onClick={() => { setShowCreate(false); resetForm() }} className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">Goal title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Squat 315 lbs"
                  maxLength={100}
                  className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all placeholder:text-muted/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">Type</label>
                <select
                  value={goalType}
                  onChange={e => setGoalType(e.target.value as GoalType)}
                  className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all"
                >
                  <option value="custom">Custom goal</option>
                  <option value="e1rm">e1RM target</option>
                  <option value="weight">Lift weight</option>
                  <option value="streak">Streak goal</option>
                </select>
              </div>

              {(goalType === 'e1rm' || goalType === 'weight') && (
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">Exercise</label>
                  <input
                    type="text"
                    value={exerciseName}
                    onChange={e => setExerciseName(e.target.value)}
                    placeholder="e.g. Barbell Back Squat"
                    className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all placeholder:text-muted/50"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">
                  Target {goalType === 'streak' ? '(weeks)' : goalType !== 'custom' ? '(lbs)' : 'value (optional)'}
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={e => setTargetValue(e.target.value)}
                  placeholder={goalType === 'streak' ? 'e.g. 12' : 'e.g. 315'}
                  min={0}
                  className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all placeholder:text-muted/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">Target date (optional)</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-1.5">Note (optional)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Any context or plan..."
                  maxLength={300}
                  rows={2}
                  className="w-full px-3 py-2 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all placeholder:text-muted/50 resize-none"
                />
              </div>

              {createError && (
                <p className="text-sm text-red-400 flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {createError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setShowCreate(false); resetForm() }} className="px-4 py-2 rounded-lg border border-white/[0.06] text-foreground text-sm hover:bg-white/[0.04] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary text-sm disabled:opacity-50">
                  {creating ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
