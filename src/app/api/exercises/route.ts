import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ExerciseDBResult {
  id: string
  name: string
  gifUrl: string
  bodyPart: string
  equipment: string
  target: string
  secondaryMuscles: string[]
  instructions: string[]
}

async function searchExerciseDB(name: string): Promise<ExerciseDBResult | null> {
  const key = process.env.RAPIDAPI_KEY
  if (!key) return null

  // Search by name (partial match, returns array sorted by relevance)
  const res = await fetch(
    `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(name.toLowerCase())}?limit=5`,
    {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    },
  )

  if (!res.ok) return null
  const results: ExerciseDBResult[] = await res.json()
  if (!results?.length) return null

  // Prefer exact name match, otherwise take first result
  const exact = results.find(r => r.name.toLowerCase() === name.toLowerCase())
  return exact ?? results[0]
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  // 1. Check Supabase cache first (free, instant)
  const { data: cached } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', name)
    .single()

  if (cached?.gif_url) return NextResponse.json({ exercise: cached })

  // 2. Fetch from ExerciseDB (costs 1 API request)
  const result = await searchExerciseDB(name)
  if (!result) return NextResponse.json({ exercise: null })

  const exercise = {
    wger_id: null,
    name: result.name,
    muscle_groups: [result.target, ...result.secondaryMuscles],
    equipment: [result.equipment],
    gif_url: result.gifUrl,
    description: result.instructions.join(' '),
  }

  // 3. Cache in Supabase so we never fetch this exercise again
  await supabase.from('exercises').upsert(exercise, { onConflict: 'name' })

  return NextResponse.json({ exercise })
}
