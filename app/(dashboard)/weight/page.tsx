'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth-simple'
import {
  getAllBodyweightHistory,
  logBodyweight,
  deleteBodyweightEntry,
  updateBodyweightEntry,
  getCurrentBodyweight,
} from '@/lib/bodyweight-storage'
import type { BodyweightEntry } from '@/types/profile'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getTodayLocalYYYYMMDD } from '@/lib/date-utils'

export default function WeightPage() {
  const [loading, setLoading] = useState(true)
  const [currentWeight, setCurrentWeight] = useState<{ weight: number; unit: string } | null>(null)
  const [history, setHistory] = useState<BodyweightEntry[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<BodyweightEntry | null>(null)

  // Form state for add/edit modal
  const [formDate, setFormDate] = useState(getTodayLocalYYYYMMDD())
  const [formWeight, setFormWeight] = useState('')
  const [formUnit, setFormUnit] = useState<'lbs' | 'kg'>('lbs')
  const [formNotes, setFormNotes] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const user = getCurrentUser()
    if (!user) {
      window.location.href = '/get-started'
      return
    }

    const [current, hist] = await Promise.all([
      getCurrentBodyweight(),
      getAllBodyweightHistory(),
    ])

    setCurrentWeight(current)
    setHistory(hist)
    setLoading(false)
  }

  const openAddModal = () => {
    setEditingEntry(null)
    setFormDate(getTodayLocalYYYYMMDD())
    setFormWeight('')
    setFormUnit(currentWeight?.unit as 'lbs' | 'kg' || 'lbs')
    setFormNotes('')
    setFormError('')
    setShowAddModal(true)
  }

  const openEditModal = (entry: BodyweightEntry) => {
    setEditingEntry(entry)
    setFormDate(entry.log_date)
    setFormWeight(entry.weight.toString())
    setFormUnit(entry.weight_unit as 'lbs' | 'kg')
    setFormNotes(entry.notes || '')
    setFormError('')
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingEntry(null)
    setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const weight = parseFloat(formWeight)
    if (isNaN(weight) || weight <= 0) {
      setFormError('Please enter a valid weight')
      return
    }

    try {
      if (editingEntry) {
        await updateBodyweightEntry(editingEntry.id, weight, formUnit, formDate, formNotes)
      } else {
        await logBodyweight(weight, formUnit, formDate, formNotes)
      }
      await loadData()
      closeModal()
    } catch (err: any) {
      setFormError(err.message || 'Failed to save weight')
    }
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this weight entry?')) return

    try {
      await deleteBodyweightEntry(entryId)
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry')
    }
  }

  // Prepare chart data
  const chartData = history.map(entry => ({
    date: new Date(entry.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: entry.weight,
  }))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Weight Tracking</h1>
        <p className="text-muted mt-2">Track your bodyweight over time</p>
      </div>

      {/* Current Weight Card */}
      <div className="card-glass card-accent-top p-6 mb-6">
        <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm text-muted mb-1">Current Weight</p>
            <p className="text-3xl font-bold text-foreground">
              {currentWeight ? `${currentWeight.weight} ${currentWeight.unit}` : 'Not set'}
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="btn-primary"
          >
            + Log Weight
          </button>
        </div>
      </div>

      {/* Chart */}
      {history.length > 0 && (
        <div className="card-glass card-accent-top p-6 mb-6">
          <div className="absolute -top-10 -left-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
          <h2 className="relative text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Weight Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted)" />
              <YAxis stroke="var(--muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#22c55e' }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Logs */}
      <div className="card-glass card-accent-top p-6">
        <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />
        <h2 className="relative text-xs font-semibold uppercase tracking-wider text-muted mb-4 flex items-center gap-2"><span className="w-0.5 h-3.5 rounded-full bg-accent/40 flex-shrink-0" />Recent Logs</h2>
        
        {history.length === 0 ? (
          <p className="text-muted text-center py-8">
            No weight logs yet. Click the Log Weight button to get started.
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {[...history].reverse().slice(0, 10).map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-white/[0.025] rounded-lg border border-white/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
              >
                <div className="flex-1">
                  <p className="text-foreground font-medium">
                    {entry.weight} {entry.weight_unit}
                  </p>
                  <p className="text-sm text-muted">
                    {new Date(entry.log_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-[#666666] mt-1">{entry.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(entry)}
                    className="px-3 py-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Weight Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-glass max-w-md w-full overflow-hidden">
            <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4, #2563eb)' }} />
            <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground">
                  {editingEntry ? 'Edit Weight Entry' : 'Log New Weight'}
                </h3>
                <p className="text-xs text-muted">{editingEntry ? 'Update your recorded weight' : 'Track your body weight'}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5">
            {formError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/15 text-red-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">
                  Weight
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    placeholder="165"
                    className="flex-1 px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all"
                    required
                  />
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as 'lbs' | 'kg')}
                    className="px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all"
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g., Morning weight, after workout, etc."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-white/[0.06] bg-white/[0.03] text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/30 transition-all resize-none placeholder:text-muted/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-white/[0.06] text-foreground text-sm hover:bg-white/[0.04] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm"
                >
                  {editingEntry ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
