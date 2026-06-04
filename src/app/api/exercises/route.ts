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

// Try multiple name variants to maximise match rate
function nameVariants(name: string): string[] {
  const lower = name.toLowerCase()
  const title = name.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  return [...new Set([lower, title, name])]
}

async function searchExerciseDB(name: string): Promise<{ result: ExerciseDBResult | null; error?: string }> {
  const key = process.env.RAPIDAPI_KEY
  if (!key) return { result: null, error: 'RAPIDAPI_KEY not set' }

  const headers = {
    'X-RapidAPI-Key': key,
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
  }

  // Try each name variant until we get results
  for (const variant of nameVariants(name)) {
    const url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(variant)}?limit=5`
    let res: Response
    try {
      res = await fetch(url, { headers })
    } catch (e) {
      return { result: null, error: `Fetch failed: ${e}` }
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { result: null, error: `ExerciseDB ${res.status}: ${body.slice(0, 200)}` }
    }

    const results: ExerciseDBResult[] = await res.json()
    if (!results?.length) continue

    // Prefer exact name match, otherwise first result
    const exact = results.find(r => r.name.toLowerCase() === name.toLowerCase())
    return { result: exact ?? results[0] }
  }

  return { result: null, error: `No results for "${name}" (tried ${nameVariants(name).join(', ')})` }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  // 1. Check Supabase cache first (only if there's a real gif_url)
  const { data: cached } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', name)
    .maybeSingle()

  if (cached?.gif_url) return NextResponse.json({ exercise: cached })

  // 2. Fetch from ExerciseDB
  const { result, error: apiError } = await searchExerciseDB(name)

  if (!result) {
    console.error(`[exercises] ${name}: ${apiError}`)
    return NextResponse.json({ exercise: null, _debug: apiError })
  }

  // DEBUG: return raw ExerciseDB result to verify gifUrl field
  return NextResponse.json({ _raw: result, _keys: Object.keys(result) })

  const exercise = {
    name: result!.name,
    muscle_groups: [result!.target, ...result!.secondaryMuscles],
    equipment: [result!.equipment],
    gif_url: result!.gifUrl,
    description: result!.instructions.slice(0, 3).join(' '),
  }

  // 3. Cache in Supabase (best-effort)
  supabase.from('exercises')
    .upsert({ ...exercise, wger_id: 0 }, { onConflict: 'name' })
    .then(({ error }) => { if (error) console.warn('[exercises] cache write failed:', error.message) })

  return NextResponse.json({ exercise })
}
