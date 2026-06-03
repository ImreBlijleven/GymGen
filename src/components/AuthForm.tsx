'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white mb-2">GymGen</h1>
        <p className="text-[var(--muted)] mb-8">AI-powered workout generator</p>

        {sent ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
            <div className="text-2xl mb-2">✉️</div>
            <p className="text-white font-medium">Check your email</p>
            <p className="text-[var(--muted)] text-sm mt-1">We sent a magic link to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-[var(--muted)] mb-2">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold rounded-xl py-3 transition-colors"
            >
              {loading ? 'Sending…' : 'Continue with Email'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
