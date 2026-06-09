import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateExerciseFromDescription } from '@/lib/llm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { description, insert_index } = await request.json()
  if (!description?.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 })
  if (typeof insert_index !== 'number') return NextResponse.json({ error: 'insert_index required' }, { status: 400 })

  const { data: workout } = await supabase
    .from('workouts')
    .select('plan')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!workout) return NextResponse.json({ error: 'Workout not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const exercise = await generateExerciseFromDescription(workout.plan, description, profile)

  const updatedExercises = [...workout.plan.exercises]
  updatedExercises.splice(insert_index, 0, exercise)
  const updatedPlan = { ...workout.plan, exercises: updatedExercises }

  await supabase
    .from('workouts')
    .update({ plan: updatedPlan })
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ exercise })
}
