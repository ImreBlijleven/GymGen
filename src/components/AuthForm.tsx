'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DumbbellLogo } from '@/components/DumbbellLogo'

// Supabase requires an email internally — we use a fixed domain so users only ever see a username
const toEmail = (username: string) => `${username.toLowerCase().trim()}@gymgen.app`

export default function AuthForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    })

    if (signInError) {
      setError('Incorrect username or password.')
      setLoading(false)
    }
    // On success the onAuthStateChange listener in page.tsx picks up the session automatically
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-2">
          <DumbbellLogo size={30} />
          <h1 className="text-3xl font-bold text-white">GymGen</h1>
        </div>
        <p className="text-[var(--muted)] text-sm mb-8">More gym. Less guessing.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Username</label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your username"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
