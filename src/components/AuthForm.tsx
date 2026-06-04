'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      // Generic message — don't reveal whether the email exists
      setError('Incorrect email or password.')
      setLoading(false)
    }
    // On success the onAuthStateChange listener in page.tsx picks up the session automatically
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white mb-2">GymGen</h1>
        <p className="text-[var(--muted)] mb-8">AI-powered workout generator</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
