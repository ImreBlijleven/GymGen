'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'
import type { Workout } from '@/lib/types'

export default function SavedPage() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/workouts')
      .then(r => r.json())
      .then(d => { setWorkouts(d.workouts ?? []); setLoading(false) })
  }, [])

  async function startWorkout(id: string) {
    router.push(`/workout/${id}`)
  }

  async function requestVariation(id: string) {
    setGenerating(id)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'saved', workout_id: id, variation: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const saveRes = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: data.plan, source: 'saved' }),
      })
      const saved = await saveRes.json()
      router.push(`/workout/${saved.workout.id}`)
    } catch (e) {
      console.error(e)
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
      <BackButton />
      <h2 className="text-2xl font-bold text-white mb-6">Your Workouts</h2>

      {workouts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-white font-medium">No saved workouts yet</p>
          <p className="text-[var(--muted)] text-sm">Generate your first workout to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {workouts.map(w => (
            <div key={w.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-white">{w.title}</h3>
                  <p className="text-[var(--muted)] text-sm">
                    {w.duration_minutes} min · {w.location} · {new Date(w.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-[var(--muted)] bg-[var(--surface-2)] px-2 py-1 rounded-lg capitalize">
                  {w.source}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => startWorkout(w.id)}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-black font-medium rounded-xl py-2 text-sm transition-colors"
                >
                  Start
                </button>
                <button
                  onClick={() => requestVariation(w.id)}
                  disabled={generating === w.id}
                  className="flex-1 bg-[var(--surface-2)] hover:bg-[var(--border)] text-white font-medium rounded-xl py-2 text-sm transition-colors disabled:opacity-50"
                >
                  {generating === w.id ? 'Generating…' : 'Variation'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
