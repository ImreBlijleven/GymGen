import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findExercise } from '@/lib/wger'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Auth required — exercises endpoint proxies WGER and writes to shared cache
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const muscleGroup = searchParams.get('muscle_group')

  if (muscleGroup) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .contains('muscle_groups', [muscleGroup])
    if (error) return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    return NextResponse.json({ exercises: data })
  }

  if (!name) return NextResponse.json({ error: 'name or muscle_group required' }, { status: 400 })

  // Check local cache first
  const { data: cached } = await supabase
    .from('exercises')
    .select('*')
    .ilike('name', name)
    .single()

  if (cached) return NextResponse.json({ exercise: cached })

  // Fetch from WGER and cache
  const exercise = await findExercise(name)
  if (!exercise) return NextResponse.json({ exercise: null })

  await supabase.from('exercises').upsert({
    wger_id: exercise.wger_id,
    name: exercise.name,
    muscle_groups: exercise.muscle_groups,
    equipment: exercise.equipment,
    gif_url: exercise.gif_url,
    description: exercise.description,
  })

  return NextResponse.json({ exercise })
}
