'use client'

import { getWorkoutSessions, getExerciseLogsForSession, getTemplateDay, getTemplates } from './storage'

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function exportWorkoutHistoryCSV(): Promise<void> {
  const sessions = await getWorkoutSessions()
  if (sessions.length === 0) {
    alert('No workouts to export.')
    return
  }

  const templates = await getTemplates()
  const templateMap = new Map(templates.map(t => [t.id, t.name]))

  const headers = [
    'Date', 'Template', 'Day', 'Exercise', 'Set #', 'Set Type',
    'Weight (lbs)', 'Reps', 'RPE', 'Target Weight', 'Target Reps',
    'Target RPE', 'Performance', 'Duration (min)', 'Rating',
    'Session Notes', 'Note Tags', 'Exercise Notes',
  ]

  const rows: string[][] = []

  for (const session of sessions) {
    const day = await getTemplateDay(session.template_day_id)
    const templateName = day?.template_id ? (templateMap.get(day.template_id) ?? '') : ''
    const dayLabel = day?.day_label ?? ''
    const durationMin = session.duration_seconds
      ? (session.duration_seconds / 60).toFixed(1)
      : ''
    const rating = session.overall_performance_rating?.toString() ?? ''
    const sessionNotes = session.session_notes ?? ''
    const noteTags = session.note_tags?.join('; ') ?? ''

    const logs = await getExerciseLogsForSession(session.id)

    if (logs.length === 0) {
      rows.push([
        session.workout_date, templateName, dayLabel, '', '', '',
        '', '', '', '', '', '', '', durationMin, rating,
        sessionNotes, noteTags, '',
      ])
    } else {
      for (const log of logs) {
        rows.push([
          session.workout_date,
          templateName,
          dayLabel,
          log.exercise_name,
          log.set_number.toString(),
          log.set_type ?? 'working',
          log.weight.toString(),
          log.reps.toString(),
          log.rpe.toString(),
          log.target_weight?.toString() ?? '',
          log.target_reps?.toString() ?? '',
          log.target_rpe?.toString() ?? '',
          log.performance_status ?? '',
          durationMin,
          rating,
          sessionNotes,
          noteTags,
          log.exercise_notes ?? '',
        ])
      }
    }
  }

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `workout_history_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
