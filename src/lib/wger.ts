import Fuse from 'fuse.js'
import { WgerExercise } from './types'

// Common LLM-generated names → WGER canonical names
const NAME_OVERRIDES: Record<string, string> = {
  'push-up': 'Push Up',
  'push ups': 'Push Up',
  'pushup': 'Push Up',
  'pull-up': 'Pull Up',
  'pull ups': 'Pull Up',
  'pullup': 'Pull Up',
  'chin-up': 'Pull Up',
  'chin up': 'Pull Up',
  'sit-up': 'Sit Up',
  'situp': 'Sit Up',
  'barbell bench press': 'Bench Press',
  'flat bench press': 'Bench Press',
  'bodyweight squat': 'Squat',
  'air squat': 'Squat',
  'dumbbell curl': 'Biceps curl',
  'bicep curl': 'Biceps curl',
  'bicep curls': 'Biceps curl',
  'tricep dip': 'Bench Dips',
  'triceps dip': 'Bench Dips',
  'mountain climber': 'Mountain Climbers',
  'jumping jack': 'Jumping Jacks',
}

interface ExerciseIndex {
  id: number
  name: string
  image_url: string | null
  muscle_groups: string[]
  equipment: string[]
  description: string
}

// Module-level cache — survives across requests in the same serverless instance
let indexCache: ExerciseIndex[] | null = null
let indexBuilding: Promise<ExerciseIndex[]> | null = null

async function buildIndex(): Promise<ExerciseIndex[]> {
  const index: ExerciseIndex[] = []
  let url: string | null = 'https://wger.de/api/v2/exerciseinfo/?format=json&limit=100&ordering=id'

  while (url) {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) break

    const data = await res.json()
    for (const ex of data.results ?? []) {
      // Pick English translation (language id 2)
      const translations: Array<{ language: number; name: string; description: string }> = ex.translations ?? []
      const en = translations.find(t => t.language === 2)
      if (!en?.name) continue

      // Pick the main image if available
      const images: Array<{ image: string; is_main: boolean }> = ex.images ?? []
      const mainImg = images.find(i => i.is_main) ?? images[0] ?? null

      // Muscle names
      const muscles: string[] = [
        ...(ex.muscles ?? []).map((m: { name_en: string }) => m.name_en),
        ...(ex.muscles_secondary ?? []).map((m: { name_en: string }) => m.name_en),
      ]

      // Equipment names
      const equipment: string[] = (ex.equipment ?? []).map((e: { name: string }) => e.name)

      index.push({
        id: ex.id,
        name: en.name,
        image_url: mainImg?.image ?? null,
        muscle_groups: muscles,
        equipment,
        description: en.description.replace(/<[^>]*>/g, '').trim(),
      })
    }

    url = data.next ?? null
  }

  return index
}

async function getIndex(): Promise<ExerciseIndex[]> {
  if (indexCache) return indexCache
  // Prevent parallel builds on concurrent requests
  if (!indexBuilding) indexBuilding = buildIndex().then(idx => { indexCache = idx; return idx })
  return indexBuilding
}

export async function findExercise(name: string): Promise<WgerExercise | null> {
  const normalised = NAME_OVERRIDES[name.toLowerCase()] ?? name

  try {
    const index = await getIndex()

    // 1. Exact match (case-insensitive)
    const exact = index.find(e => e.name.toLowerCase() === normalised.toLowerCase())
    if (exact) return toWgerExercise(exact)

    // 2. Fuzzy match
    const fuse = new Fuse(index, { keys: ['name'], threshold: 0.4 })
    const results = fuse.search(normalised)
    if (results.length === 0) return null

    return toWgerExercise(results[0].item)
  } catch {
    return null
  }
}

function toWgerExercise(e: ExerciseIndex): WgerExercise {
  return {
    wger_id: e.id,
    name: e.name,
    muscle_groups: e.muscle_groups,
    equipment: e.equipment,
    gif_url: e.image_url ?? '',
    description: e.description,
  }
}
