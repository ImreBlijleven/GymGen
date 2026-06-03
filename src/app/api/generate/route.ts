import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateFromChoices, generateFromChat, generateVariation } from '@/lib/llm'
import { ChoicesInput } from '@/lib/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { mode, message, choices, workout_id, variation } = body

  // Fetch user profile for context
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  let plan

  if (mode === 'choices') {
    plan = await generateFromChoices(choices as ChoicesInput, profile)
  } else if (mode === 'chat') {
    plan = await generateFromChat(message as string, profile)
  } else if (mode === 'saved' && variation && workout_id) {
    const { data: workout } = await supabase
      .from('workouts')
      .select('plan')
      .eq('id', workout_id)
      .single()
    if (!workout) return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    plan = await generateVariation(workout.plan, profile)
  } else {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  return NextResponse.json({ plan })
}
