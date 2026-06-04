import Fuse from 'fuse.js'

const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'
const CACHE_KEY = 'gymgen_exercise_db_v1'

export interface LocalExercise {
  id: string
  name: string
  equipment: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  level: string
  imageUrl: string | null
}

// Map user-visible equipment labels → free-exercise-db equipment values
export const EQUIPMENT_DB_MAP: Record<string, string[]> = {
  // Free / bodyweight
  'bodyweight':        ['body only'],
  // Free weights
  'barbell':           ['barbell'],
  'dumbbell':          ['dumbbell'],
  'kettlebell':        ['kettlebells'],
  'e-z curl bar':      ['e-z curl bar'],
  'resistance bands':  ['bands'],
  // Machines & cables
  'cable machine':     ['cable'],
  'machine':           ['machine'],
  'exercise ball':     ['exercise ball'],
  'medicine ball':     ['medicine ball'],
  'foam roller':       ['foam roll'],
  // Cardio machines — no matching DB entries; LLM handles these
  'treadmill':         [],
  'elliptical':        [],
  'stationary bike':   [],
  'rowing machine':    [],
  'stair climber':     [],
  'air bike':          [],
  // Racks / specialty — map to barbell (exercises done on them use barbells)
  'squat rack':        ['barbell'],
  'smith machine':     ['machine'],
  'leg press':         ['machine'],
  'lat pulldown':      ['machine', 'cable'],
  'chest press machine': ['machine'],
}

// All user-facing equipment options grouped for the UI
export const EQUIPMENT_GROUPS = [
  {
    label: 'Bodyweight',
    items: ['bodyweight'],
  },
  {
    label: 'Free Weights',
    items: ['barbell', 'dumbbell', 'kettlebell', 'e-z curl bar', 'resistance bands'],
  },
  {
    label: 'Cardio Machines',
    items: ['treadmill', 'elliptical', 'stationary bike', 'rowing machine', 'stair climber', 'air bike'],
  },
  {
    label: 'Strength Machines',
    items: ['squat rack', 'smith machine', 'leg press', 'lat pulldown', 'chest press machine', 'cable machine', 'machine'],
  },
  {
    label: 'Other',
    items: ['exercise ball', 'medicine ball', 'foam roller'],
  },
]

// Name overrides: LLM-generated names → DB names
const NAME_OVERRIDES: Record<string, string> = {
  'push-up': 'Push-Up',
  'push ups': 'Push-Up',
  'pushup': 'Push-Up',
  'pushups': 'Push-Up',
  'pull-up': 'Pull-up',
  'pull ups': 'Pull-up',
  'pullup': 'Pull-up',
  'chin up': 'Pull-up',
  'chin-up': 'Pull-up',
  'sit-up': 'Sit-Up',
  'situp': 'Sit-Up',
  'bodyweight squat': 'Squat',
  'air squat': 'Squat',
  'bicep curl': 'Dumbbell Bicep Curl',
  'bicep curls': 'Dumbbell Bicep Curl',
  'dumbbell curl': 'Dumbbell Bicep Curl',
  'tricep dip': 'Triceps Dip',
  'bench dip': 'Triceps Dip',
  'jumping jack': 'Jumping Jacks',
  'mountain climber': 'Mountain Climbers',
  'burpee': 'Burpees',
  'plank': 'Plank',
  'deadlift': 'Barbell Deadlift',
  'bench press': 'Barbell Bench Press',
  'flat bench press': 'Barbell Bench Press',
  'overhead press': 'Barbell Shoulder Press',
  'ohp': 'Barbell Shoulder Press',
  'lat pulldown': 'Wide-Grip Lat Pulldown',
  'leg press': 'Leg Press',
  'leg curl': 'Lying Leg Curls',
  'calf raise': 'Standing Calf Raises',
  'hip thrust': 'Barbell Hip Thrust',
  'face pull': 'Face Pull',
  'cable row': 'Seated Cable Rows',
  'rowing': 'Bent Over Barbell Row',
}

let dbCache: LocalExercise[] | null = null
let fuseCache: Fuse<LocalExercise> | null = null

async function loadDB(): Promise<LocalExercise[]> {
  if (dbCache) return dbCache

  // Try localStorage first
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      dbCache = JSON.parse(cached)
      return dbCache!
    }
  } catch {}

  // Fetch from /public
  const res = await fetch('/exercises.json')
  const raw: Array<{
    id: string
    name: string
    equipment: string
    primaryMuscles: string[]
    secondaryMuscles: string[]
    instructions: string[]
    category: string
    level: string
    images: string[]
  }> = await res.json()

  dbCache = raw.map(ex => ({
    id: ex.id,
    name: ex.name,
    equipment: ex.equipment,
    primaryMuscles: ex.primaryMuscles,
    secondaryMuscles: ex.secondaryMuscles,
    instructions: ex.instructions,
    category: ex.category,
    level: ex.level,
    imageUrl: ex.images?.length ? `${IMAGE_BASE}/${ex.id}/0.jpg` : null,
  }))

  // Cache to localStorage (best-effort)
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(dbCache)) } catch {}

  return dbCache
}

function getFuse(db: LocalExercise[]): Fuse<LocalExercise> {
  if (!fuseCache) fuseCache = new Fuse(db, { keys: ['name'], threshold: 0.35 })
  return fuseCache
}

export async function findLocalExercise(name: string): Promise<LocalExercise | null> {
  const db = await loadDB()
  const normalised = NAME_OVERRIDES[name.toLowerCase()] ?? name

  // 1. Exact match
  const exact = db.find(e => e.name.toLowerCase() === normalised.toLowerCase())
  if (exact) return exact

  // 2. Fuzzy
  const results = getFuse(db).search(normalised)
  return results[0]?.item ?? null
}

export async function getExerciseNames(): Promise<string[]> {
  const db = await loadDB()
  return db.map(e => e.name)
}
