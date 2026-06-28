'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'
import type { RunInput, RunType, RunTerrain } from '@/lib/types'

const DURATIONS: RunInput['duration'][] = [20, 30, 45, 60, 90]

const RUN_TYPES: { value: RunType; label: string; desc: string }[] = [
  { value: 'easy',      label: 'Easy run',         desc: 'Comfortable pace, conversational effort' },
  { value: 'tempo',     label: 'Tempo run',         desc: 'Comfortably hard, sustained effort' },
  { value: 'interval',  label: 'Intervals',         desc: 'Alternating fast bursts with recovery' },
  { value: 'long run',  label: 'Long run',          desc: 'Slow and steady, build endurance' },
]

const TERRAINS: { value: RunTerrain; label: string; icon: string }[] = [
  { value: 'road',      label: 'Road',      icon: '🛣️' },
  { value: 'trail',     label: 'Trail',     icon: '🌲' },
  { value: 'track',     label: 'Track',     icon: '🏟️' },
  { value: 'treadmill', label: 'Treadmill', icon: '⚙️' },
]

export default function RunPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [input, setInput] = useState<Partial<RunInput>>({})
  const [sessionContext, setSessionContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(final: RunInput, context?: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'run', run: final, session_context: context || undefined }),
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
        <p className="text-[var(--muted)]">Planning your run…</p>
      </div>
    )
  }

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
      <BackButton href="/" />

      {/* Progress */}
      <div className="flex gap-1 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? 'bg-amber-500' : 'bg-[var(--border)]'}`} />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {step === 0 && (
        <QuestionBlock title="How long is your run?">
          <div className="grid grid-cols-3 gap-3">
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
        <QuestionBlock title="What kind of run?">
          <div className="flex flex-col gap-3">
            {RUN_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => { setInput(i => ({ ...i, run_type: t.value })); setStep(2) }}
                className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-amber-500/50 transition-all text-left"
              >
                <div>
                  <div className="font-medium text-white">{t.label}</div>
                  <div className="text-[var(--muted)] text-sm mt-0.5">{t.desc}</div>
                </div>
                <span className="text-[var(--muted)] ml-3">→</span>
              </button>
            ))}
          </div>
        </QuestionBlock>
      )}

      {step === 2 && (
        <QuestionBlock title="Where are you running?">
          <div className="grid grid-cols-2 gap-3">
            {TERRAINS.map(t => (
              <button
                key={t.value}
                onClick={() => { setInput(i => ({ ...i, terrain: t.value })); setStep(3) }}
                className="py-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-amber-500/50 transition-all active:scale-95 flex flex-col items-center gap-2"
              >
                <span className="text-3xl">{t.icon}</span>
                <span className="text-white font-medium text-sm">{t.label}</span>
              </button>
            ))}
          </div>
        </QuestionBlock>
      )}

      {step === 3 && (
        <QuestionBlock title="Anything to add?">
          <textarea
            value={sessionContext}
            onChange={e => setSessionContext(e.target.value)}
            placeholder="e.g. training for a 10K next month, I tend to get shin splints…"
            rows={4}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-amber-500 resize-none transition-colors mb-4"
          />
          <button
            onClick={() => submit(input as RunInput, sessionContext)}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl py-3 transition-colors mb-3"
          >
            Generate Run →
          </button>
          <button
            onClick={() => submit(input as RunInput)}
            className="w-full text-[var(--muted)] hover:text-white text-sm py-2 transition-colors"
          >
            Skip
          </button>
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
