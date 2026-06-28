'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'
import type { SwimInput, SwimFocus, SwimVenue } from '@/lib/types'

const DURATIONS: SwimInput['duration'][] = [20, 30, 45, 60]

const FOCUSES: { value: SwimFocus; label: string; desc: string }[] = [
  { value: 'fitness',   label: 'Fitness',    desc: 'Mix of cardio and strength in the water' },
  { value: 'technique', label: 'Technique',  desc: 'Drills to sharpen form and efficiency' },
  { value: 'endurance', label: 'Endurance',  desc: 'Longer sets at a steady pace' },
  { value: 'speed',     label: 'Speed',      desc: 'Short sprints and high-intensity intervals' },
]

const VENUES: { value: SwimVenue; label: string; icon: string }[] = [
  { value: 'indoor pool',  label: 'Indoor pool',  icon: '🏊' },
  { value: 'outdoor pool', label: 'Outdoor pool', icon: '☀️' },
  { value: 'open water',   label: 'Open water',   icon: '🌊' },
]

export default function SwimPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<Partial<SwimInput>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(final: SwimInput) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'swim', swim: final }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const saveRes = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: data.plan, source: 'choices' }),
      })
      const saved = await saveRes.json()
      if (!saveRes.ok) throw new Error(saved.error || 'Failed to save workout')
      router.push(`/workout/${saved.workout.id}/overview`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        <p className="text-[var(--muted)]">Planning your swim session…</p>
      </div>
    )
  }

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
      <BackButton href="/" />

      {/* Progress */}
      <div className="flex gap-1 mb-8">
        {[0, 1, 2].map(i => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? 'bg-amber-500' : 'bg-[var(--border)]'}`} />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {step === 0 && (
        <QuestionBlock title="How long is your session?">
          <div className="grid grid-cols-2 gap-3">
            {DURATIONS.map(d => (
              <button
                key={d}
                onClick={() => { setInput(i => ({ ...i, duration: d })); setStep(1) }}
                className="py-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-amber-500/50 text-white font-medium transition-all active:scale-95"
              >
                {d} min
              </button>
            ))}
          </div>
        </QuestionBlock>
      )}

      {step === 1 && (
        <QuestionBlock title="What's your focus?">
          <div className="flex flex-col gap-3">
            {FOCUSES.map(f => (
              <button
                key={f.value}
                onClick={() => { setInput(i => ({ ...i, focus: f.value })); setStep(2) }}
                className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-amber-500/50 transition-all text-left"
              >
                <div>
                  <div className="font-medium text-white">{f.label}</div>
                  <div className="text-[var(--muted)] text-sm mt-0.5">{f.desc}</div>
                </div>
                <span className="text-[var(--muted)] ml-3">→</span>
              </button>
            ))}
          </div>
        </QuestionBlock>
      )}

      {step === 2 && (
        <QuestionBlock title="Where are you swimming?">
          <div className="flex flex-col gap-3">
            {VENUES.map(v => (
              <button
                key={v.value}
                onClick={() => submit({ ...input, venue: v.value } as SwimInput)}
                className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-amber-500/50 transition-all active:scale-95"
              >
                <span className="text-3xl">{v.icon}</span>
                <span className="text-white font-medium">{v.label}</span>
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
