import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Exercise } from '@/lib/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { exercises } = await request.json() as { exercises: Exercise[] }
  if (!Array.isArray(exercises)) {
    return NextResponse.json({ error: 'exercises array required' }, { status: 400 })
  }

  const { data: workout } = await supabase
    .from('workouts')
    .select('plan')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!workout) return NextResponse.json({ error: 'Workout not found' }, { status: 404 })

  const updatedPlan = { ...workout.plan, exercises }

  const { error } = await supabase
    .from('workouts')
    .update({ plan: updatedPlan })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
