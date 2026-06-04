'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BackButton from '@/components/BackButton'
import type { Profile, FitnessLevel } from '@/lib/types'

const EQUIPMENT_OPTIONS = ['barbell', 'dumbbell', 'kettlebell', 'resistance bands', 'pull-up bar', 'cables', 'bodyweight']

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Partial<Profile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      if (p) setProfile(p)
      setLoading(false)
    })
  }, [])

  async function save() {
    const supabase = createClient()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({ ...profile, id: user.id })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/')
  }

  function toggleEquipment(item: string) {
    const current = profile.default_equipment ?? []
    const next = current.includes(item) ? current.filter(e => e !== item) : [...current, item]
    setProfile(p => ({ ...p, default_equipment: next }))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
      <BackButton />
      <h2 className="text-2xl font-bold text-white mb-6">Profile</h2>

      <div className="flex flex-col gap-5">
        <Field label="Name">
          <input
            type="text"
            value={profile.name ?? ''}
            onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
            placeholder="Your name"
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-green-500 transition-colors"
          />
        </Field>

        <Field label="Age">
          <input
            type="number"
            value={profile.age ?? ''}
            onChange={e => setProfile(p => ({ ...p, age: parseInt(e.target.value) || undefined }))}
            placeholder="e.g. 28"
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-green-500 transition-colors"
          />
        </Field>

        <Field label="Fitness Level">
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as FitnessLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setProfile(p => ({ ...p, fitness_level: level }))}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all ${
                  profile.fitness_level === level
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-[var(--surface)] border-[var(--border)] text-white'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Available Equipment">
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT_OPTIONS.map(item => (
              <button
                key={item}
                onClick={() => toggleEquipment(item)}
                className={`py-2.5 px-3 rounded-xl border text-sm capitalize transition-all text-left ${
                  (profile.default_equipment ?? []).includes(item)
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-[var(--surface)] border-[var(--border)] text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </Field>

        <button
          onClick={save}
          disabled={saving}
          className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold rounded-xl py-3 transition-colors"
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Profile'}
        </button>

        <button
          onClick={signOut}
          className="text-[var(--muted)] hover:text-white text-sm py-2 transition-colors"
        >
          Sign out
        </button>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-[var(--muted)] mb-2">{label}</label>
      {children}
    </div>
  )
}
