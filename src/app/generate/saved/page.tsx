'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'
import type { Workout } from '@/lib/types'

interface SavedEntry {
  id: string
  name: string
  pinned: boolean
  created_at: string
  workout: Workout
}

export default function SavedPage() {
  const router = useRouter()
  const [saved, setSaved] = useState<SavedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (editingId) editRef.current?.focus()
  }, [editingId])

  async function load() {
    const res = await fetch('/api/saved')
    const data = await res.json()
    setSaved(data.saved ?? [])
    setLoading(false)
  }

  function startEdit(entry: SavedEntry) {
    setEditingId(entry.id)
    setEditName(entry.name)
  }

  async function confirmRename(id: string) {
    if (!editName.trim()) { setEditingId(null); return }
    await fetch(`/api/saved/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    setSaved(prev => prev.map(s => s.id === id ? { ...s, name: editName.trim() } : s))
    setEditingId(null)
  }

  async function deleteSaved(id: string) {
    await fetch(`/api/saved/${id}`, { method: 'DELETE' })
    setSaved(prev => prev.filter(s => s.id !== id))
    setConfirmDelete(null)
  }

  async function requestVariation(workoutId: string, savedId: string) {
    setGenerating(savedId)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'saved', workout_id: workoutId, variation: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const saveRes = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: data.plan, source: 'saved' }),
      })
      const saved = await saveRes.json()
      router.push(`/workout/${saved.workout.id}/overview`)
    } catch {
      setGenerating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
      <BackButton href="/" />
      <h2 className="text-2xl font-bold text-white mb-6">Saved Workouts</h2>

      {saved.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-white font-medium">No saved workouts yet</p>
          <p className="text-[var(--muted)] text-sm">
            Generate a workout and tap <strong>Save</strong> during the session to keep it here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {saved.map(entry => (
            <div key={entry.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">

              {/* Name row */}
              <div className="flex items-start justify-between gap-2 mb-1">
                {editingId === entry.id ? (
                  <input
                    ref={editRef}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => confirmRename(entry.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') confirmRename(entry.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1 bg-[var(--surface-2)] border border-green-500 rounded-lg px-3 py-1 text-white text-sm focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => startEdit(entry)}
                    className="font-semibold text-white text-left hover:text-green-400 transition-colors"
                  >
                    {entry.name}
                  </button>
                )}

                {/* Delete button */}
                {confirmDelete === entry.id ? (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => deleteSaved(entry.id)}
                      className="text-xs text-red-400 font-medium hover:text-red-300"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-[var(--muted)] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(entry.id)}
                    className="text-[var(--muted)] hover:text-red-400 transition-colors shrink-0 text-lg leading-none"
                    aria-label="Delete"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Meta */}
              <p className="text-[var(--muted)] text-sm mb-3">
                {entry.workout.duration_minutes} min · {entry.workout.location} · {new Date(entry.created_at).toLocaleDateString()}
              </p>

              {/* Muscle group tags */}
              {(entry.workout.muscle_groups ?? []).length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {entry.workout.muscle_groups.map(m => (
                    <span key={m} className="text-xs px-2 py-0.5 rounded-lg bg-[var(--surface-2)] text-[var(--muted)] capitalize">{m}</span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/workout/${entry.workout.id}`)}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-black font-medium rounded-xl py-2 text-sm transition-colors"
                >
                  Start
                </button>
                <button
                  onClick={() => requestVariation(entry.workout.id, entry.id)}
                  disabled={generating === entry.id}
                  className="flex-1 bg-[var(--surface-2)] hover:bg-[var(--border)] text-white font-medium rounded-xl py-2 text-sm transition-colors disabled:opacity-50"
                >
                  {generating === entry.id ? 'Generating…' : 'Variation'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
