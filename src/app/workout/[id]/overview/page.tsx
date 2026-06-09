'use client'

import { useEffect, useState, use, useCallback, useRef } from 'react'
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

function exerciseKey(e: Exercise, i: number) {
  return `${e.name}-${i}`
}

interface SortableExerciseProps {
  id: string
  index: number
  exercise: Exercise
  swapping: boolean
  anyBusy: boolean
  isCurrent?: boolean
  onSwap: () => void
  onRemove: () => void
}

function SortableExercise({ id, index, exercise, swapping, anyBusy, isCurrent, onSwap, onRemove }: SortableExerciseProps) {
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
          <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
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

      {/* Swap */}
      <button
        onClick={onSwap}
        disabled={anyBusy}
        className="shrink-0 text-xs px-3 py-1.5 rounded-xl bg-[var(--surface-2)] text-[var(--muted)] hover:text-white hover:bg-[var(--border)] transition-colors disabled:opacity-40"
      >
        {swapping ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-green-500 border-t-transparent animate-spin inline-block" />
            Swapping
          </span>
        ) : 'Swap'}
      </button>

      {/* Trash */}
      <button
        onClick={onRemove}
        disabled={anyBusy}
        className="shrink-0 text-[var(--muted)] hover:text-red-400 transition-colors disabled:opacity-40 p-1"
        aria-label="Remove exercise"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  )
}

interface AddRowProps {
  insertIndex: number
  isOpen: boolean
  isLoading: boolean
  onOpen: () => void
  onCancel: () => void
  onSubmit: (desc: string) => void
}

function AddRow({ insertIndex, isOpen, isLoading, onOpen, onCancel, onSubmit }: AddRowProps) {
  const [desc, setDesc] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) { setDesc(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [isOpen])

  if (isOpen) {
    return (
      <div className="bg-[var(--surface)] border border-green-500/40 rounded-2xl px-4 py-3 flex gap-2 items-center">
        <input
          ref={inputRef}
          value={desc}
          onChange={e => setDesc(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && desc.trim()) onSubmit(desc.trim())
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="e.g. a core exercise, bicep curl, 10 min cardio…"
          className="flex-1 bg-transparent text-white text-sm placeholder:text-[var(--muted)] focus:outline-none"
        />
        {isLoading ? (
          <span className="w-4 h-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin shrink-0" />
        ) : (
          <>
            <button
              onClick={() => desc.trim() && onSubmit(desc.trim())}
              disabled={!desc.trim()}
              className="text-xs text-green-400 hover:text-green-300 font-medium disabled:opacity-40 shrink-0"
            >
              Add
            </button>
            <button onClick={onCancel} className="text-xs text-[var(--muted)] hover:text-white shrink-0">
              Cancel
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center justify-center gap-1.5 py-1 text-[var(--muted)] hover:text-green-400 transition-colors group"
      aria-label={`Add exercise at position ${insertIndex + 1}`}
    >
      <span className="w-4 h-px bg-[var(--border)] group-hover:bg-green-500/40 transition-colors flex-1" />
      <span className="text-xs font-bold">+</span>
      <span className="w-4 h-px bg-[var(--border)] group-hover:bg-green-500/40 transition-colors flex-1" />
    </button>
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
  const [adding, setAdding] = useState<number | null>(null) // index to insert before (exercises.length = append)
  const [addingLoading, setAddingLoading] = useState(false)
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

  const persist = useCallback(async (updated: Exercise[]) => {
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
    persist(newExercises)
  }

  async function swapExercise(index: number) {
    setSwapping(index)
    try {
      const res = await fetch(`/api/workouts/${id}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise_index: index }),
      })
      if (!res.ok) throw new Error()
      const { exercise } = await res.json()
      setExercises(prev => { const u = [...prev]; u[index] = exercise; return u })
      setKeys(prev => { const u = [...prev]; u[index] = exerciseKey(exercise, index); return u })
    } finally {
      setSwapping(null)
    }
  }

  async function removeExercise(index: number) {
    const updated = exercises.filter((_, i) => i !== index)
    const updatedKeys = updated.map(exerciseKey)
    setExercises(updated)
    setKeys(updatedKeys)
    persist(updated)
  }

  async function addExercise(insertIndex: number, description: string) {
    setAddingLoading(true)
    try {
      const res = await fetch(`/api/workouts/${id}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, insert_index: insertIndex }),
      })
      if (!res.ok) throw new Error()
      const { exercise } = await res.json()
      setExercises(prev => {
        const u = [...prev]
        u.splice(insertIndex, 0, exercise)
        return u
      })
      setKeys(prev => {
        const u = [...prev]
        u.splice(insertIndex, 0, exerciseKey(exercise, insertIndex))
        return u
      })
      setAdding(null)
    } finally {
      setAddingLoading(false)
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
    new Set(exercises.map(e => e.equipment).filter((eq): eq is string => !!eq && eq.toLowerCase() !== 'bodyweight')),
  )
  const anyBusy = swapping !== null || addingLoading

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{workout.title}</h2>
        <p className="text-[var(--muted)] text-sm mt-1">
          {workout.duration_minutes} min · {workout.plan.muscle_groups.join(', ')}
        </p>
      </div>

      {/* Equipment */}
      {equipmentNeeded.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 mb-5">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wide font-medium mb-2">Equipment needed</p>
          <div className="flex flex-wrap gap-2">
            {equipmentNeeded.map(eq => (
              <span key={eq} className="text-sm px-3 py-1 rounded-xl bg-[var(--surface-2)] text-white capitalize">{eq}</span>
            ))}
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[var(--muted)] uppercase tracking-wide font-medium">{exercises.length} exercises</p>
        {saving && <p className="text-xs text-[var(--muted)]">Saving…</p>}
      </div>

      {/* List */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={keys} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col mb-6">
            {/* Add before first */}
            <AddRow
              insertIndex={0}
              isOpen={adding === 0}
              isLoading={addingLoading && adding === 0}
              onOpen={() => setAdding(0)}
              onCancel={() => setAdding(null)}
              onSubmit={desc => addExercise(0, desc)}
            />

            {exercises.map((exercise, i) => (
              <div key={keys[i]} className="flex flex-col">
                <SortableExercise
                  id={keys[i]}
                  index={i}
                  exercise={exercise}
                  swapping={swapping === i}
                  anyBusy={anyBusy}
                  isCurrent={i === resumeIndex && resumeIndex > 0}
                  onSwap={() => swapExercise(i)}
                  onRemove={() => removeExercise(i)}
                />
                {/* Add after this exercise */}
                <AddRow
                  insertIndex={i + 1}
                  isOpen={adding === i + 1}
                  isLoading={addingLoading && adding === i + 1}
                  onOpen={() => setAdding(i + 1)}
                  onCancel={() => setAdding(null)}
                  onSubmit={desc => addExercise(i + 1, desc)}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Begin / Resume */}
      <button
        onClick={() => router.push(`/workout/${id}${resumeIndex > 0 ? `?start=${resumeIndex}` : ''}`)}
        className="w-full bg-green-500 hover:bg-green-400 text-black font-bold rounded-2xl py-4 text-lg transition-colors active:scale-[0.98]"
      >
        {resumeIndex > 0 ? `Resume at exercise ${resumeIndex + 1} →` : 'Begin Workout →'}
      </button>
    </main>
  )
}
