import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time route to seed the exercises table from ExerciseDB.
// Protected by ADMIN_SECRET env var.
// After running once, all exercise lookups are served from Supabase for free.

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const key = process.env.RAPIDAPI_KEY
  if (!key) return NextResponse.json({ error: 'RAPIDAPI_KEY not set' }, { status: 500 })

  // Use service role to bypass RLS for bulk insert
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const headers = {
    'X-RapidAPI-Key': key,
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
  }

  let total = 0
  let offset = 0
  const limit = 100
  const errors: string[] = []

  // Paginate through all exercises
  while (true) {
    const url = `https://exercisedb.p.rapidapi.com/exercises?limit=${limit}&offset=${offset}`
    const res = await fetch(url, { headers })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      errors.push(`offset ${offset}: HTTP ${res.status} — ${body.slice(0, 100)}`)
      break
    }

    const exercises = await res.json()
    if (!Array.isArray(exercises) || exercises.length === 0) break

    // Upsert batch into Supabase
    const rows = exercises.map((ex: {
      id: string; name: string; gifUrl: string; target: string;
      secondaryMuscles: string[]; equipment: string; instructions: string[]
    }) => ({
      wger_id: parseInt(ex.id, 10) || 0,   // ExerciseDB IDs are "0001", "0002" etc.
      name: ex.name,
      muscle_groups: [ex.target, ...(ex.secondaryMuscles ?? [])],
      equipment: [ex.equipment],
      gif_url: ex.gifUrl ?? '',
      description: (ex.instructions ?? []).slice(0, 2).join(' '),
    }))

    const { error } = await supabase
      .from('exercises')
      .upsert(rows, { onConflict: 'wger_id' })

    if (error) errors.push(`offset ${offset}: ${error.message}`)
    else total += rows.length

    if (exercises.length < limit) break
    offset += limit
  }

  return NextResponse.json({ seeded: total, errors })
}
