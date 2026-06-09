'use client'

import { useEffect, useState, use, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Workout, Exercise } from '@/lib/types'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Stable key per exercise so dnd-kit can track identity through swaps/reorders
function exerciseKey(e: Exercise, i: number) {
  return `${e.name}-${i}`
}

interface SortableExerciseProps {
  id: string
  index: number
  exercise: Exercise
  swapping: boolean
  anySwapping: boolean
  onSwap: () => void
  isCurrent?: boolean
}

function SortableExercise({ id, index, exercise, swapping, anySwapping, onSwap, isCurrent }: SortableExerciseProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl px-4 py-3 flex items-center gap-3 touch-none select-none border ${isCurrent ? 'bg-green-500/10 border-green-500/40' : 'bg-[var(--surface)] border-[var(--border)]'}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 text-[var(--muted)] hover:text-white cursor-grab active:cursor-grabbing p-1 -ml-1 touch-none"
        aria-label="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.5" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>

      {/* Index */}
      <span className="text-[var(--muted)] text-sm w-5 shrink-0 text-center">{index + 1}</span>

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
        onClick={onSwap}
        disabled={anySwapping}
        className="shrink-0 text-xs px-3 py-1.5 rounded-xl bg-[var(--surface-2)] text-[var(--muted)] hover:text-white hover:bg-[var(--border)] transition-colors disabled:opacity-40"
      >
        {swapping ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-green-500 border-t-transparent animate-spin inline-block" />
            Swapping
          </span>
        ) : (
          'Swap'
        )}
      </button>
    </div>
  )
}

export default function WorkoutOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const resumeIndex = parseInt(searchParams.get('resume') ?? '0') || 0
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [keys, setKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [swapping, setSwapping] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  useEffect(() => {
    fetch('/api/workouts')
      .then(r => r.json())
      .then(d => {
        const found = (d.workouts ?? []).find((w: Workout) => w.id === id) ?? null
        setWorkout(found)
        const exs: Exercise[] = found?.plan.exercises ?? []
        setExercises(exs)
        setKeys(exs.map(exerciseKey))
        setLoading(false)
      })
  }, [id])

  const persistOrder = useCallback(async (updated: Exercise[]) => {
    setSaving(true)
    await fetch(`/api/workouts/${id}/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercises: updated }),
    })
    setSaving(false)
  }, [id])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = keys.indexOf(active.id as string)
    const newIndex = keys.indexOf(over.id as string)
    const newExercises = arrayMove(exercises, oldIndex, newIndex)
    const newKeys = arrayMove(keys, oldIndex, newIndex)
    setExercises(newExercises)
    setKeys(newKeys)
    persistOrder(newExercises)
  }

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
      setKeys(prev => {
        const updated = [...prev]
        updated[index] = exerciseKey(exercise, index)
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
              <span key={eq} className="text-sm px-3 py-1 rounded-xl bg-[var(--surface-2)] text-white capitalize">
                {eq}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Exercise list */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[var(--muted)] uppercase tracking-wide font-medium">
          {exercises.length} exercises
        </p>
        {saving && (
          <p className="text-xs text-[var(--muted)]">Saving order…</p>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={keys} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 mb-6">
            {exercises.map((exercise, i) => (
              <SortableExercise
                key={keys[i]}
                id={keys[i]}
                index={i}
                exercise={exercise}
                swapping={swapping === i}
                anySwapping={swapping !== null}
                onSwap={() => swapExercise(i)}
                isCurrent={i === resumeIndex && resumeIndex > 0}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Begin / Resume button */}
      <button
        onClick={() => router.push(`/workout/${id}${resumeIndex > 0 ? `?start=${resumeIndex}` : ''}`)}
        className="w-full bg-green-500 hover:bg-green-400 text-black font-bold rounded-2xl py-4 text-lg transition-colors active:scale-[0.98]"
      >
        {resumeIndex > 0 ? `Resume at exercise ${resumeIndex + 1} →` : 'Begin Workout →'}
      </button>
    </main>
  )
}
