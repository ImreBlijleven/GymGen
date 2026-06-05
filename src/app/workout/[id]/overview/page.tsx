'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import type { Workout, Exercise } from '@/lib/types'

export default function WorkoutOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [swapping, setSwapping] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/workouts')
      .then(r => r.json())
      .then(d => {
        const found = (d.workouts ?? []).find((w: Workout) => w.id === id) ?? null
        setWorkout(found)
        setExercises(found?.plan.exercises ?? [])
        setLoading(false)
      })
  }, [id])

  async function swapExercise(index: number) {
    setSwapping(index)
    try {
      const res = await fetch(`/api/workouts/${id}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise_index: index }),
      })
      if (!res.ok) throw new Error('Swap failed')
      const { exercise } = await res.json()
      setExercises(prev => {
        const updated = [...prev]
        updated[index] = exercise
        return updated
      })
    } finally {
      setSwapping(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-white">Workout not found</p>
        <button onClick={() => router.push('/')} className="text-green-500 text-sm">Go home</button>
      </div>
    )
  }

  // Derive unique equipment from exercises
  const equipmentNeeded = Array.from(
    new Set(
      exercises
        .map(e => e.equipment)
        .filter((eq): eq is string => !!eq && eq.toLowerCase() !== 'bodyweight'),
    ),
  )

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{workout.title}</h2>
        <p className="text-[var(--muted)] text-sm mt-1">
          {workout.duration_minutes} min · {workout.plan.muscle_groups.join(', ')}
        </p>
      </div>

      {/* Equipment needed */}
      {equipmentNeeded.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 mb-5">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wide font-medium mb-2">Equipment needed</p>
          <div className="flex flex-wrap gap-2">
            {equipmentNeeded.map(eq => (
              <span
                key={eq}
                className="text-sm px-3 py-1 rounded-xl bg-[var(--surface-2)] text-white capitalize"
              >
                {eq}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Exercise list */}
      <p className="text-xs text-[var(--muted)] uppercase tracking-wide font-medium mb-3">
        {exercises.length} exercises
      </p>
      <div className="flex flex-col gap-2 mb-6">
        {exercises.map((exercise, i) => (
          <div
            key={i}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center gap-3"
          >
            {/* Index */}
            <span className="text-[var(--muted)] text-sm w-5 shrink-0 text-center">{i + 1}</span>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{exercise.name}</p>
              <p className="text-[var(--muted)] text-xs mt-0.5">
                {exercise.sets && exercise.reps
                  ? `${exercise.sets} × ${exercise.reps} reps`
                  : exercise.duration_seconds
                  ? `${Math.round(exercise.duration_seconds / 60)} min`
                  : null}
                {exercise.equipment && (
                  <span className="ml-2 capitalize opacity-70">{exercise.equipment}</span>
                )}
              </p>
            </div>

            {/* Swap button */}
            <button
              onClick={() => swapExercise(i)}
              disabled={swapping !== null}
              className="shrink-0 text-xs px-3 py-1.5 rounded-xl bg-[var(--surface-2)] text-[var(--muted)] hover:text-white hover:bg-[var(--border)] transition-colors disabled:opacity-40"
            >
              {swapping === i ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border border-green-500 border-t-transparent animate-spin inline-block" />
                  Swapping
                </span>
              ) : (
                'Swap'
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Begin button */}
      <button
        onClick={() => router.push(`/workout/${id}`)}
        className="w-full bg-green-500 hover:bg-green-400 text-black font-bold rounded-2xl py-4 text-lg transition-colors active:scale-[0.98]"
      >
        Begin Workout →
      </button>
    </main>
  )
}
