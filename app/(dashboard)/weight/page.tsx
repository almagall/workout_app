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
        <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Weight Tracking</h1>
        <p className="text-muted mt-2">Track your bodyweight over time</p>
      </div>

      {/* Current Weight Card */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted mb-1">Current Weight</p>
            <p className="text-3xl font-bold text-foreground">
              {currentWeight ? `${currentWeight.weight} ${currentWeight.unit}` : 'Not set'}
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-gray-200 transition-colors"
          >
            + Log Weight
          </button>
        </div>
      </div>

      {/* Chart */}
      {history.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Weight Over Time</h2>
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
      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Recent Logs</h2>
        
        {history.length === 0 ? (
          <p className="text-muted text-center py-8">
            No weight logs yet. Click the Log Weight button to get started.
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {[...history].reverse().slice(0, 10).map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-elevated rounded-lg border border-border"
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
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-card">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {editingEntry ? 'Edit Weight Entry' : 'Log New Weight'}
            </h3>

            {formError && (
              <div className="mb-4 bg-red-900/20 border border-red-800 text-red-300 px-3 py-2 rounded text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Weight
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    placeholder="165"
                    className="flex-1 px-3 py-2 border border-border bg-card text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                    required
                  />
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as 'lbs' | 'kg')}
                    className="px-3 py-2 border border-border bg-card text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g., Morning weight, after workout, etc."
                  rows={2}
                  className="w-full px-3 py-2 border border-border bg-card text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-gray-200 transition-colors"
                >
                  {editingEntry ? 'Update' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-accent text-background rounded-lg font-medium hover:shadow-glow transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
