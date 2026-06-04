import Fuse from 'fuse.js'

const CACHE_KEY = 'gymgen_exercise_gifs_v1'

interface GifEntry {
  id: string
  body_part: string
  title: string
  gif_url: string
}

// LLM name → dataset title overrides
const NAME_OVERRIDES: Record<string, string> = {
  'squat': 'barbell squat',
  'bodyweight squat': 'squat',
  'air squat': 'squat',
  'push up': 'push-up',
  'push-up': 'push-up',
  'pushup': 'push-up',
  'pull up': 'pull-up',
  'pull-up': 'pull-up',
  'pullup': 'pull-up',
  'chin up': 'chin-up',
  'chin-up': 'chin-up',
  'sit up': 'sit-up',
  'situp': 'sit-up',
  'deadlift': 'barbell deadlift',
  'bench press': 'barbell bench press',
  'flat bench press': 'barbell bench press',
  'overhead press': 'standing barbell shoulder press',
  'ohp': 'standing barbell shoulder press',
  'shoulder press': 'standing dumbbell shoulder press',
  'bicep curl': 'dumbbell curl',
  'bicep curls': 'dumbbell curl',
  'dumbbell bicep curl': 'dumbbell curl',
  'tricep dip': 'tricep dips',
  'bench dip': 'tricep dips',
  'lat pulldown': 'lat pulldown',
  'cable row': 'seated cable row',
  'face pull': 'face pull',
  'hip thrust': 'barbell hip thrust',
  'mountain climber': 'mountain climbers',
  'mountain climbers': 'mountain climbers',
  'jumping jack': 'jumping jacks',
  'jumping jacks': 'jumping jacks',
  'burpee': 'burpees',
  'calf raise': 'standing calf raises',
  'leg press': 'leg press',
  'leg curl': 'lying leg curl',
  'romanian deadlift': 'romanian deadlift',
  'rdl': 'romanian deadlift',
  'treadmill': 'treadmill running',
  'rowing machine': 'rowing machine',
  'stationary bike': 'stationary bike',
}

let dbCache: GifEntry[] | null = null
let fuseCache: Fuse<GifEntry> | null = null

async function load(): Promise<GifEntry[]> {
  if (dbCache) return dbCache

  // Try localStorage first (instant after first load)
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      dbCache = JSON.parse(cached)
      return dbCache!
    }
  } catch {}

  const res = await fetch('/exercise-gifs.json')
  dbCache = await res.json()

  try { localStorage.setItem(CACHE_KEY, JSON.stringify(dbCache)) } catch {}
  return dbCache!
}

function fuse(db: GifEntry[]): Fuse<GifEntry> {
  if (!fuseCache) {
    fuseCache = new Fuse(db, {
      keys: ['title'],
      threshold: 0.35,
      ignoreLocation: true,
    })
  }
  return fuseCache
}

export async function findGif(name: string): Promise<string | null> {
  const db = await load()
  const query = NAME_OVERRIDES[name.toLowerCase()] ?? name

  // 1. Exact match (case-insensitive)
  const exact = db.find(e => e.title.toLowerCase() === query.toLowerCase())
  if (exact?.gif_url) return exact.gif_url

  // 2. Fuzzy match
  const results = fuse(db).search(query)
  return results[0]?.item?.gif_url ?? null
}
