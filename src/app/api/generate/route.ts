import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateFromChoices, generateFromChat, generateVariation } from '@/lib/llm'
import { ChoicesInput } from '@/lib/types'

const VALID_MODES = ['chat', 'choices', 'saved']
const MAX_MESSAGE_LENGTH = 500

// Simple in-memory rate limiter: max 10 generations per user per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (entry.count >= 10) return true
  entry.count++
  return false
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
  }

  const body = await request.json()
  const { mode, message, choices, workout_id, variation } = body

  if (!VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  if (mode === 'chat') {
    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message must be under ${MAX_MESSAGE_LENGTH} characters` }, { status: 400 })
    }
  }

  // Fetch user profile for context
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  let plan

  try {
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
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
  } catch (e) {
    console.error('[generate] LLM error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate workout. Please try again.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ plan })
}
