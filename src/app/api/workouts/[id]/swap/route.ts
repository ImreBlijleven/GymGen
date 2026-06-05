import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSwapExercise } from '@/lib/llm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { exercise_index } = await request.json()
  if (typeof exercise_index !== 'number') {
    return NextResponse.json({ error: 'exercise_index required' }, { status: 400 })
  }

  const { data: workout } = await supabase
    .from('workouts')
    .select('plan')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!workout) return NextResponse.json({ error: 'Workout not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const replacement = await generateSwapExercise(workout.plan, exercise_index, profile)

  // Patch the plan in-place and persist
  const updatedExercises = [...workout.plan.exercises]
  updatedExercises[exercise_index] = replacement
  const updatedPlan = { ...workout.plan, exercises: updatedExercises }

  await supabase
    .from('workouts')
    .update({ plan: updatedPlan })
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ exercise: replacement })
}
