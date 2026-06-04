import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  // Exact match first
  const { data: exact } = await supabase
    .from('exercises')
    .select('name, gif_url, muscle_groups, equipment, description')
    .ilike('name', name)
    .maybeSingle()

  if (exact) return NextResponse.json({ exercise: exact, _found: 'exact' })

  // Fuzzy: search for any exercise whose name contains key words
  const words = name.split(' ').filter(w => w.length > 3)
  if (words.length > 0) {
    const { data: fuzzy } = await supabase
      .from('exercises')
      .select('name, gif_url, muscle_groups, equipment, description')
      .textSearch('name', words.join(' | '), { config: 'english' })
      .limit(5)

    if (fuzzy?.length) return NextResponse.json({ exercise: fuzzy[0], _found: 'fuzzy', _all: fuzzy.map(e => e.name) })
  }

  return NextResponse.json({ exercise: null, _debug: `No match for "${name}"` })
}
