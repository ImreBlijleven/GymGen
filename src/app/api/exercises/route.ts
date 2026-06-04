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
    .select('*')
    .ilike('name', name)
    .maybeSingle()

  if (exact?.gif_url) return NextResponse.json({ exercise: exact })

  // Fuzzy: search for any exercise whose name contains one of the key words
  const words = name.split(' ').filter(w => w.length > 3)
  if (words.length > 0) {
    const { data: fuzzy } = await supabase
      .from('exercises')
      .select('*')
      .textSearch('name', words.join(' | '), { config: 'english' })
      .limit(5)

    const match = fuzzy?.find(e => e.gif_url)
    if (match) return NextResponse.json({ exercise: match })
  }

  return NextResponse.json({ exercise: null })
}
