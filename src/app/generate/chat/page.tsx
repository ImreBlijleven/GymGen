'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'

export default function ChatPage() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'chat', message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const saveRes = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: data.plan, source: 'chat' }),
      })
      const saved = await saveRes.json()
      router.push(`/workout/${saved.workout.id}/overview`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const examples = [
    'Something quick for my upper body, I only have 20 minutes',
    'A challenging leg day with no equipment',
    'Light full body workout to recover from yesterday',
  ]

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
      <h2 className="text-2xl font-bold text-white mb-2">What kind of workout?</h2>
      <p className="text-[var(--muted)] mb-6 text-sm">Describe it in your own words</p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex flex-col gap-2 mb-6">
        {examples.map(ex => (
          <button
            key={ex}
            onClick={() => setMessage(ex)}
            className="text-left text-sm text-[var(--muted)] hover:text-white px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-green-500/30 transition-all"
          >
            &ldquo;{ex}&rdquo;
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-auto">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="E.g. 30 minute push day at home…"
          rows={3}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-green-500 resize-none transition-colors"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="bg-green-500 hover:bg-green-400 disabled:opacity-30 text-black font-semibold rounded-xl py-3 transition-colors"
        >
          Generate Workout →
        </button>
      </form>
    </main>
  )
}
