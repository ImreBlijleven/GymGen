import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, pinned } = await request.json()

  const { data, error } = await supabase
    .from('saved_workouts')
    .upsert({
      user_id: user.id,
      workout_id: id,
      name: name ?? 'Saved Workout',
      pinned: pinned ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: data }, { status: 201 })
}
