'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import type { Workout, Exercise } from '@/lib/types'

export default function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exerciseData, setExerciseData] = useState<Record<string, Exercise>>({})
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [wakeLockSupported, setWakeLockSupported] = useState(false)

  useEffect(() => {
    setWakeLockSupported('wakeLock' in navigator)
    fetch(`/api/workouts`)
      .then(r => r.json())
      .then(d => {
        const found = (d.workouts ?? []).find((w: Workout) => w.id === id)
        setWorkout(found ?? null)
        setLoading(false)
      })
  }, [id])

  // Wake Lock
  useEffect(() => {
    if (!workout || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    ;(navigator.wakeLock as WakeLock).request('screen').then(l => { lock = l }).catch(() => {})
    return () => { lock?.release() }
  }, [workout])

  // Fetch exercise GIF lazily
  const fetchExercise = useCallback(async (name: string) => {
    if (exerciseData[name]) return
    const res = await fetch(`/api/exercises?name=${encodeURIComponent(name)}`)
    const data = await res.json()
    if (data.exercise) {
      setExerciseData(prev => ({ ...prev, [name]: data.exercise }))
    }
  }, [exerciseData])

  useEffect(() => {
    if (!workout) return
    const exercise = workout.plan.exercises[currentIndex]
    if (exercise) fetchExercise(exercise.name)
  }, [workout, currentIndex, fetchExercise])

  // Rest timer
  useEffect(() => {
    if (restTimer === null || restTimer <= 0) return
    const t = setTimeout(() => setRestTimer(r => (r ?? 0) - 1), 1000)
    return () => clearTimeout(t)
  }, [restTimer])

  async function saveWorkout() {
    setSaveStatus('saving')
    await fetch(`/api/workouts/${id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: workout?.title, pinned: false }),
    })
    setSaveStatus('saved')
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

  const exercises = workout.plan.exercises
  const exercise = exercises[currentIndex]
  const enriched = exerciseData[exercise.name]
  const isLast = currentIndex === exercises.length - 1
  const progress = ((currentIndex) / exercises.length) * 100

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full workout-active">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => router.push('/')} className="text-[var(--muted)] text-sm">✕ End</button>
          <span className="text-[var(--muted)] text-sm">{currentIndex + 1} / {exercises.length}</span>
          <button
            onClick={saveWorkout}
            disabled={saveStatus !== 'idle'}
            className="text-sm text-green-400 disabled:text-[var(--muted)]"
          >
            {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
        <div className="w-full bg-[var(--border)] rounded-full h-1">
          <div className="bg-green-500 h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <h2 className="text-base text-[var(--muted)] mt-2">{workout.title}</h2>
      </div>

      {/* Exercise */}
      <div className="flex-1 flex flex-col px-4 py-6 overflow-y-auto">
        <h3 className="text-3xl font-bold text-white mb-2">{exercise.name}</h3>

        <div className="flex gap-4 mb-6">
          {exercise.sets && exercise.reps && (
            <Stat label="Sets × Reps" value={`${exercise.sets} × ${exercise.reps}`} />
          )}
          {exercise.duration_seconds && (
            <Stat label="Duration" value={`${exercise.duration_seconds}s`} />
          )}
          <Stat label="Rest" value={`${exercise.rest_seconds}s`} />
        </div>

        {exercise.notes && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-6">
            <p className="text-green-300 text-sm">💡 {exercise.notes}</p>
          </div>
        )}

        {/* Exercise image */}
        {enriched === undefined ? (
          // Still fetching
          <div className="rounded-2xl bg-[var(--surface)] mb-6 aspect-video flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
          </div>
        ) : enriched?.gif_url ? (
          <div className="rounded-2xl overflow-hidden bg-[var(--surface)] mb-6 aspect-video flex items-center justify-center">
            <img src={enriched.gif_url} alt={exercise.name} className="w-full h-full object-contain" />
          </div>
        ) : (
          // WGER has no image for this exercise
          <div className="rounded-2xl bg-[var(--surface)] mb-6 aspect-video flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">🏋️</span>
            <span className="text-[var(--muted)] text-sm">No image available</span>
          </div>
        )}

        {enriched?.description && (
          <p className="text-[var(--muted)] text-sm mb-6">{enriched.description.slice(0, 200)}</p>
        )}

        {/* Muscles */}
        {(enriched?.muscle_groups ?? []).length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {(enriched?.muscle_groups ?? []).map(m => (
              <span key={m} className="text-xs px-2 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--muted)]">{m}</span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[var(--border)]">
        {restTimer !== null && restTimer > 0 ? (
          <div className="text-center">
            <p className="text-[var(--muted)] text-sm mb-1">Rest</p>
            <p className="text-4xl font-bold text-green-400 mb-3">{restTimer}s</p>
            <button
              onClick={() => setRestTimer(0)}
              className="text-sm text-[var(--muted)] hover:text-white"
            >
              Skip rest →
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (isLast) {
                router.push('/')
              } else {
                setRestTimer(exercise.rest_seconds)
                setCurrentIndex(i => i + 1)
              }
            }}
            className="w-full bg-green-500 hover:bg-green-400 text-black font-bold rounded-2xl py-4 text-lg transition-colors active:scale-[0.98]"
          >
            {isLast ? '🎉 Finish Workout' : 'Next Exercise →'}
          </button>
        )}
      </div>

      {!wakeLockSupported && (
        <p className="text-center text-xs text-[var(--muted)] pb-2">
          Keep your screen on manually to avoid lock
        </p>
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface)] rounded-xl px-4 py-3 text-center">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-[var(--muted)] mt-0.5">{label}</div>
    </div>
  )
}
