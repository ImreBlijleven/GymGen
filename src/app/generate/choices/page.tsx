'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'
import type { ChoicesInput, MuscleGroup, Location, Intensity } from '@/lib/types'

const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full body', 'cardio']
const DURATIONS = [15, 30, 45, 60] as const
const LOCATIONS: { value: Location; label: string }[] = [
  { value: 'gym', label: '🏋️ Gym' },
  { value: 'home', label: '🏠 Home' },
  { value: 'hotel', label: '🏨 Hotel' },
  { value: 'outdoors', label: '🌳 Outdoors' },
]
const INTENSITIES: { value: Intensity; label: string; desc: string }[] = [
  { value: 'light', label: 'Light', desc: 'Easy, recovery pace' },
  { value: 'moderate', label: 'Moderate', desc: 'Challenging but sustainable' },
  { value: 'hard', label: 'Hard', desc: 'Push your limits' },
]

export default function ChoicesPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [choices, setChoices] = useState<Partial<ChoicesInput>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(final: ChoicesInput) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'choices', choices: final }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const saveRes = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: data.plan, source: 'choices' }),
      })
      const saved = await saveRes.json()
      router.push(`/workout/${saved.workout.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  function pick<K extends keyof ChoicesInput>(key: K, value: ChoicesInput[K]) {
    const next = { ...choices, [key]: value }
    setChoices(next)

    if (step === 0) setStep(1)
    else if (step === 1) setStep(2)
    else if (step === 2) { /* muscle groups — wait for confirmation */ }
    else if (step === 3) submit(next as ChoicesInput)
  }

  function confirmMuscles() {
    if ((choices.muscle_groups ?? []).length === 0) return
    setStep(3)
  }

  function toggleMuscle(m: MuscleGroup) {
    const current = choices.muscle_groups ?? []
    const next = current.includes(m) ? current.filter(x => x !== m) : [...current, m]
    setChoices(c => ({ ...c, muscle_groups: next }))
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
        <p className="text-[var(--muted)]">Building your workout…</p>
      </div>
    )
  }

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
      <BackButton />

      <div className="mb-6">
        <div className="flex gap-1 mb-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? 'bg-green-500' : 'bg-[var(--border)]'}`} />
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {step === 0 && (
        <QuestionBlock title="How long do you have?">
          <div className="grid grid-cols-2 gap-3">
            {DURATIONS.map(d => (
              <OptionButton key={d} label={`${d} min`} onClick={() => pick('duration', d)} />
            ))}
          </div>
        </QuestionBlock>
      )}

      {step === 1 && (
        <QuestionBlock title="Where are you?">
          <div className="grid grid-cols-2 gap-3">
            {LOCATIONS.map(l => (
              <OptionButton key={l.value} label={l.label} onClick={() => pick('location', l.value)} />
            ))}
          </div>
        </QuestionBlock>
      )}

      {step === 2 && (
        <QuestionBlock title="What do you want to work on?">
          <div className="grid grid-cols-2 gap-3">
            {MUSCLE_GROUPS.map(m => (
              <button
                key={m}
                onClick={() => toggleMuscle(m)}
                className={`py-3 px-4 rounded-xl border text-sm font-medium capitalize transition-all ${
                  (choices.muscle_groups ?? []).includes(m)
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-[var(--surface)] border-[var(--border)] text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={confirmMuscles}
            disabled={(choices.muscle_groups ?? []).length === 0}
            className="w-full mt-4 bg-green-500 hover:bg-green-400 disabled:opacity-30 text-black font-semibold rounded-xl py-3 transition-colors"
          >
            Next →
          </button>
        </QuestionBlock>
      )}

      {step === 3 && (
        <QuestionBlock title="Intensity today?">
          <div className="flex flex-col gap-3">
            {INTENSITIES.map(i => (
              <button
                key={i.value}
                onClick={() => pick('intensity', i.value)}
                className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-green-500/50 transition-all"
              >
                <div className="text-left">
                  <div className="font-medium text-white">{i.label}</div>
                  <div className="text-[var(--muted)] text-sm">{i.desc}</div>
                </div>
                <span className="text-[var(--muted)]">→</span>
              </button>
            ))}
          </div>
        </QuestionBlock>
      )}
    </main>
  )
}

function QuestionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
      {children}
    </div>
  )
}

function OptionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="py-4 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-green-500/50 text-white font-medium transition-all active:scale-95"
    >
      {label}
    </button>
  )
}
