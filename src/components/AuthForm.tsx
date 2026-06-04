'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthForm() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Sign in anonymously — no email or password needed
    const { data, error: signInError } = await supabase.auth.signInAnonymously()
    if (signInError || !data.user) {
      setError(signInError?.message ?? 'Could not sign in. Try again.')
      setLoading(false)
      return
    }

    // Save the name to the profile
    await supabase.from('profiles').upsert({
      id: data.user.id,
      name: trimmed,
      fitness_level: 'intermediate',
      default_equipment: [],
    })

    // Auth state change in page.tsx will pick up the new session automatically
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white mb-2">GymGen</h1>
        <p className="text-[var(--muted)] mb-8">AI-powered workout generator</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">What's your name?</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 transition-colors"
          >
            {loading ? 'Just a sec…' : "Let's go →"}
          </button>
        </form>
      </div>
    </div>
  )
}
