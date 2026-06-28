'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import AuthForm from '@/components/AuthForm'
import { DumbbellLogo } from '@/components/DumbbellLogo'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return <AuthForm />

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <DumbbellLogo size={30} />
          <h1 className="text-3xl font-bold text-white">GymGen</h1>
        </div>
        <p className="text-[var(--muted)] text-sm">More gym. Less guessing.</p>
      </div>

      <div className="flex flex-col gap-8">
        {/* GYM */}
        <section>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-medium mb-3">Gym</p>
          <div className="flex flex-col gap-3">
            <ModeCard href="/generate/chat" icon="💬" title="Chat" description="Describe your workout in plain language" />
            <ModeCard href="/generate/choices" icon="⚡" title="Quick Build" description="Answer a few questions, get a plan instantly" />
          </div>
        </section>

        {/* CARDIO */}
        <section>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-medium mb-3">Cardio</p>
          <div className="flex flex-col gap-3">
            <ModeCard href="/generate/run" icon="🏃" title="Running" description="Plan a run — easy, tempo, intervals, or long" />
            <ModeCard href="/generate/swim" icon="🏊" title="Swimming" description="Build a swim session for any goal" />
          </div>
        </section>

        {/* SAVED */}
        <section>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-medium mb-3">Library</p>
          <ModeCard href="/generate/saved" icon="📋" title="Saved Workouts" description="Resume a plan or request a variation" />
        </section>
      </div>

      <div className="mt-auto pt-8 flex justify-end">
        <Link href="/profile" className="text-[var(--muted)] text-sm hover:text-white transition-colors">
          Profile →
        </Link>
      </div>
    </main>
  )
}

function ModeCard({ href, icon, title, description }: { href: string; icon: string; title: string; description: string }) {
  return (
    <Link href={href} className="block p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-amber-500/50 active:scale-[0.98] transition-all">
      <div className="flex items-center gap-4">
        <span className="text-3xl">{icon}</span>
        <div>
          <div className="font-semibold text-white text-lg">{title}</div>
          <div className="text-[var(--muted)] text-sm mt-0.5">{description}</div>
        </div>
        <span className="ml-auto text-[var(--muted)]">→</span>
      </div>
    </Link>
  )
}
