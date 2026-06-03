import Fuse from 'fuse.js'
import { WgerExercise } from './types'

// Manual overrides for common LLM-generated names vs WGER canonical names
const NAME_OVERRIDES: Record<string, string> = {
  'push-up': 'Push Up',
  'pushup': 'Push Up',
  'pull-up': 'Pull Up',
  'pullup': 'Pull Up',
  'sit-up': 'Sit Up',
  'situp': 'Sit Up',
  'barbell bench press': 'Bench Press',
  'flat bench press': 'Bench Press',
  'chin up': 'Pull Up',
}

interface WgerApiExercise {
  id: number
  name: string
  description: string
  muscles: Array<{ name_en: string }>
  muscles_secondary: Array<{ name_en: string }>
  equipment: Array<{ name: string }>
  images: Array<{ image: string; is_main: boolean }>
}

let exerciseCache: WgerApiExercise[] | null = null

async function fetchAllExercises(): Promise<WgerApiExercise[]> {
  if (exerciseCache) return exerciseCache

  const res = await fetch(
    'https://wger.de/api/v2/exercise/?format=json&language=2&limit=200&offset=0',
    { next: { revalidate: 86400 } },
  )
  if (!res.ok) return []

  const data = await res.json()
  exerciseCache = data.results ?? []
  return exerciseCache!
}

async function fetchExerciseImages(exerciseId: number): Promise<string | null> {
  const res = await fetch(
    `https://wger.de/api/v2/exerciseimage/?exercise=${exerciseId}&format=json`,
    { next: { revalidate: 86400 } },
  )
  if (!res.ok) return null
  const data = await res.json()
  const main = data.results?.find((img: { is_main: boolean; image: string }) => img.is_main)
  return main?.image ?? data.results?.[0]?.image ?? null
}

export async function findExercise(name: string): Promise<WgerExercise | null> {
  const normalised = NAME_OVERRIDES[name.toLowerCase()] ?? name

  try {
    // Try exact match first via search API
    const searchRes = await fetch(
      `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(normalised)}&language=english&format=json`,
      { next: { revalidate: 3600 } },
    )

    if (searchRes.ok) {
      const searchData = await searchRes.json()
      const suggestion = searchData.suggestions?.[0]

      if (suggestion) {
        const gifUrl = await fetchExerciseImages(suggestion.data.id)
        return {
          wger_id: suggestion.data.id,
          name: suggestion.value,
          muscle_groups: [],
          equipment: [],
          gif_url: gifUrl ?? '',
          description: suggestion.data.description ?? '',
        }
      }
    }

    // Fallback: fuzzy match against local cache
    const all = await fetchAllExercises()
    if (all.length === 0) return null

    const fuse = new Fuse(all, { keys: ['name'], threshold: 0.4 })
    const results = fuse.search(normalised)
    if (results.length === 0) return null

    const match = results[0].item
    const gifUrl = await fetchExerciseImages(match.id)

    return {
      wger_id: match.id,
      name: match.name,
      muscle_groups: [
        ...match.muscles.map(m => m.name_en),
        ...match.muscles_secondary.map(m => m.name_en),
      ],
      equipment: match.equipment.map(e => e.name),
      gif_url: gifUrl ?? '',
      description: match.description.replace(/<[^>]*>/g, ''),
    }
  } catch {
    return null
  }
}
