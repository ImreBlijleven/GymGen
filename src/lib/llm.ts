import { WorkoutPlan, Exercise, ChoicesInput, RunInput, SwimInput, Profile, Location, MuscleGroup } from './types'

const WORKOUT_SCHEMA = `{
  "title": "string",
  "duration_minutes": number,
  "location": "gym|home|hotel|outdoors",
  "muscle_groups": ["string"],
  "exercises": [
    {
      "name": "string",
      "equipment": "string (primary equipment required, e.g. 'barbell', 'dumbbell', 'bodyweight', 'treadmill')",
      "sets": number (optional),
      "reps": number (optional),
      "duration_seconds": number (optional),
      "rest_seconds": number,
      "instructions": ["string (step 1)", "string (step 2)", ...] (3-5 concise steps on how to perform the exercise),
      "tips": "string (one key coaching tip or common mistake to avoid)"
    }
  ]
}`

const EXERCISE_SCHEMA = `{
  "name": "string",
  "equipment": "string",
  "sets": number (optional),
  "reps": number (optional),
  "duration_seconds": number (optional),
  "rest_seconds": number,
  "instructions": ["string", ...],
  "tips": "string"
}`

// Equipment descriptions to help the LLM generate appropriate exercises
const EQUIPMENT_CONTEXT: Record<string, string> = {
  'treadmill':           'running, walking, intervals, incline walking',
  'elliptical':          'low-impact full-body cardio, stride variations',
  'stationary bike':     'cycling intervals, steady-state cardio, spin drills',
  'rowing machine':      'rowing intervals, steady-state rowing — targets back, legs, and core',
  'stair climber':       'stair climbing, step intervals — targets glutes and quads',
  'air bike':            'all-out sprints, intervals — full body cardio',
  'squat rack':          'barbell squats, rack pulls, box squats, barbell lunges',
  'smith machine':       'guided squats, shoulder press, Romanian deadlift',
  'leg press':           'leg press variations, single-leg press, calf raises on leg press',
  'lat pulldown':        'wide-grip lat pulldown, close-grip pulldown, straight-arm pulldown',
  'chest press machine': 'machine chest press, machine incline press',
  'cable machine':       'cable flys, cable rows, face pulls, tricep pushdowns, cable curls',
}

function buildSystemPrompt(profile: Partial<Profile> | null): string {
  const equipment = profile?.default_equipment ?? []
  const equipmentLines = equipment.length
    ? equipment.map(e => `  - ${e}${EQUIPMENT_CONTEXT[e] ? ': ' + EQUIPMENT_CONTEXT[e] : ''}`).join('\n')
    : '  - bodyweight only'

  const genderLabel: Record<string, string> = {
    male: 'male', female: 'female', other: 'non-binary/other', prefer_not_to_say: 'not specified',
  }

  return `You are an expert personal trainer with deep knowledge of exercise science.
User profile:
  - Fitness level: ${profile?.fitness_level ?? 'intermediate'}
  - Age: ${profile?.age ? profile.age + ' years' : 'not specified'}
  - Gender: ${profile?.gender ? genderLabel[profile.gender] ?? 'not specified' : 'not specified'}
  - Available equipment:
${equipmentLines}${profile?.preferences ? `\n  - Additional preferences: ${profile.preferences}` : ''}
Today's date: ${new Date().toISOString().split('T')[0]}.

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema — no prose, no markdown fences, no extra text:
${WORKOUT_SCHEMA}

Rules:
- Only use exercises that match the available equipment listed above
- Cardio machine exercises: use duration_seconds instead of sets/reps (e.g. 10 min treadmill = duration_seconds: 600)
- Beginners: avoid complex lifts, prioritise form, lighter intensity
- Always include rest_seconds for every exercise (0 for cardio steady-state)
- Add notes when exercise form or machine setup matters
- Total exercise time should fit within duration_minutes
- Prefer common exercise names (e.g. "Barbell Bench Press", "Pull-up", "Squat") for better image matching
- Always use metric units: kg for weight, km/h for speed, km for distance, meters for height`
}

function buildChoicesPrompt(choices: ChoicesInput): string {
  return `Generate a ${choices.duration}-minute ${choices.intensity} workout.
Location: ${choices.location}.
Target muscle groups: ${choices.muscle_groups.join(', ')}.`
}

function buildChatPrompt(message: string): string {
  return message
}

function buildVariationPrompt(plan: WorkoutPlan): string {
  return `Here is an existing workout plan (JSON):
${JSON.stringify(plan, null, 2)}

Generate a variation of this plan that:
- Keeps the same duration (${plan.duration_minutes} min), location, and muscle groups
- Substitutes at least 50% of exercises with alternatives
- Maintains the same intensity level
- Returns ONLY valid JSON matching the schema above`
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<WorkoutPlan> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
  })
  const result = await model.generateContent(userPrompt)
  const text = result.response.text().trim()
  // Strip markdown fences if the model wraps the JSON despite instructions
  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  try {
    return JSON.parse(json) as WorkoutPlan
  } catch {
    throw new Error('Gemini returned invalid JSON')
  }
}

async function callGroq(systemPrompt: string, userPrompt: string): Promise<WorkoutPlan> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Groq HTTP ${response.status}: ${body}`)
  }
  const data = await response.json()
  const text = data.choices[0].message.content.trim()
  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  try {
    return JSON.parse(json) as WorkoutPlan
  } catch {
    throw new Error(`Groq returned invalid JSON: ${text.slice(0, 200)}`)
  }
}


async function generateWithFallback(systemPrompt: string, userPrompt: string): Promise<WorkoutPlan> {
  try {
    return await callGemini(systemPrompt, userPrompt)
  } catch (e) {
    console.error('[LLM] Gemini failed:', e)
    try {
      return await callGroq(systemPrompt, userPrompt)
    } catch (e2) {
      console.error('[LLM] Groq failed:', e2)
      throw new Error(`Both LLM providers failed. Gemini: ${e instanceof Error ? e.message : e}. Groq: ${e2 instanceof Error ? e2.message : e2}`)
    }
  }
}

export async function generateFromChoices(
  choices: ChoicesInput,
  profile: Partial<Profile> | null,
): Promise<WorkoutPlan> {
  return generateWithFallback(buildSystemPrompt(profile), buildChoicesPrompt(choices))
}

export async function generateFromChat(
  message: string,
  profile: Partial<Profile> | null,
): Promise<WorkoutPlan> {
  return generateWithFallback(buildSystemPrompt(profile), buildChatPrompt(message))
}

export async function generateExerciseFromDescription(
  plan: WorkoutPlan,
  description: string,
  profile: Partial<Profile> | null,
): Promise<Exercise> {
  const systemPrompt = buildSystemPrompt(profile)
  const userPrompt = `Here is the current workout plan:
${JSON.stringify(plan, null, 2)}

The user wants to add a new exercise matching this description: "${description}"

Generate ONE exercise that:
- Matches the user's description as closely as possible
- Fits the overall workout style, intensity, and equipment
- Is NOT already in the plan

Respond with ONLY valid JSON matching this exact schema — no prose, no markdown:
${EXERCISE_SCHEMA}`

  const parse = (text: string): Exercise => {
    const json = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    return JSON.parse(json) as Exercise
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: systemPrompt })
    const result = await model.generateContent(userPrompt)
    return parse(result.response.text())
  } catch {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          temperature: 0.7,
        }),
      })
      const data = await response.json()
      return parse(data.choices[0].message.content)
    } catch {
      throw new Error('Failed to generate exercise')
    }
  }
}

export async function generateSwapExercise(
  plan: WorkoutPlan,
  exerciseIndex: number,
  profile: Partial<Profile> | null,
): Promise<Exercise> {
  const original = plan.exercises[exerciseIndex]
  const systemPrompt = buildSystemPrompt(profile)
  const userPrompt = `Here is the current workout plan:
${JSON.stringify(plan, null, 2)}

The user wants to swap exercise #${exerciseIndex + 1}: "${original.name}".

Generate ONE replacement exercise that:
- Targets the same muscle group(s) and matches the same intensity/effort level
- Uses the same or compatible equipment as "${original.name}"
- Has similar volume (sets/reps) or duration
- Is NOT any of the exercises already in the plan
- Fits within the workout's overall structure

Respond with ONLY valid JSON matching this exact schema — no prose, no markdown:
${EXERCISE_SCHEMA}`

  const parse = (text: string): Exercise => {
    const json = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    return JSON.parse(json) as Exercise
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: systemPrompt })
    const result = await model.generateContent(userPrompt)
    return parse(result.response.text())
  } catch {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          temperature: 0.7,
        }),
      })
      const data = await response.json()
      return parse(data.choices[0].message.content)
    } catch {
      throw new Error('Failed to generate swap exercise')
    }
  }
}

const RUN_SCHEMA = `{
  "title": "string",
  "duration_minutes": number,
  "location": "outdoors|gym",
  "muscle_groups": ["running"],
  "exercises": [
    {
      "name": "string (e.g. 'Warm-up Jog', '4×800m Intervals', 'Tempo Pace', 'Cool-down Walk')",
      "duration_seconds": number,
      "rest_seconds": number,
      "instructions": ["string", ...] (pacing/effort cues — 2-4 steps),
      "tips": "string (one coaching cue)"
    }
  ]
}`

const SWIM_SCHEMA = `{
  "title": "string",
  "duration_minutes": number,
  "location": "pool|open water",
  "muscle_groups": ["swimming"],
  "exercises": [
    {
      "name": "string (e.g. 'Freestyle Warm-up', '10×50m Sprints', 'Pull Buoy Set', 'Easy Cool-down')",
      "sets": number (optional, for repeated sets like intervals),
      "duration_seconds": number (duration of one set or the whole segment),
      "rest_seconds": number,
      "instructions": ["string", ...] (technique/pacing cues — 2-4 steps),
      "tips": "string (one coaching cue)",
      "notes": "string (optional distance, e.g. '50m per set')"
    }
  ]
}`

function buildRunSystemPrompt(profile: Partial<Profile> | null): string {
  const parts: string[] = []
  if (profile?.fitness_level) parts.push(`Fitness level: ${profile.fitness_level}`)
  if (profile?.age) parts.push(`Age: ${profile.age}`)
  if (profile?.run_preferences) parts.push(`Runner context: ${profile.run_preferences}`)

  return `You are an expert running coach. Generate structured run workouts as segments (warm-up, main set, cool-down).
${parts.length ? `\nRunner profile:\n${parts.map(p => `  - ${p}`).join('\n')}\n` : ''}
IMPORTANT: Respond with ONLY valid JSON matching this exact schema — no prose, no markdown fences:
${RUN_SCHEMA}

Rules:
- All exercises use duration_seconds (no sets/reps for easy/tempo/long; intervals may use sets + duration_seconds per rep)
- rest_seconds is 0 for continuous running segments; use it between intervals
- location: use "gym" for treadmill, "outdoors" for road/trail/track
- Always include a warm-up and cool-down segment
- Pacing cues should reference effort level (e.g. conversational pace, 80% effort, race pace)
- Total segment durations must add up to approximately duration_minutes`
}

function buildSwimSystemPrompt(profile: Partial<Profile> | null): string {
  const parts: string[] = []
  if (profile?.fitness_level) parts.push(`Fitness level: ${profile.fitness_level}`)
  if (profile?.age) parts.push(`Age: ${profile.age}`)
  if (profile?.swim_preferences) parts.push(`Swimmer context: ${profile.swim_preferences}`)

  return `You are an expert swim coach. Generate structured swim sessions as pool sets (warm-up, main set, cool-down).
${parts.length ? `\nSwimmer profile:\n${parts.map(p => `  - ${p}`).join('\n')}\n` : ''}
IMPORTANT: Respond with ONLY valid JSON matching this exact schema — no prose, no markdown fences:
${SWIM_SCHEMA}

Rules:
- Use duration_seconds for each segment or set
- For interval sets, use sets + duration_seconds (time per rep) + rest_seconds (rest between reps)
- Add notes for distance when relevant (e.g. "50m per rep")
- location: use "pool" for indoor/outdoor pool, "open water" for open water
- Always include a warm-up and cool-down
- Technique cues should be specific (e.g. high elbow catch, bilateral breathing)
- Total duration should match duration_minutes`
}

function buildRunPrompt(input: RunInput, sessionContext?: string): string {
  const terrainLabel: Record<string, string> = {
    road: 'road running', trail: 'trail running', track: 'track', treadmill: 'treadmill',
  }
  const typeLabel: Record<string, string> = {
    easy: 'easy aerobic run', tempo: 'tempo run', interval: 'interval training', 'long run': 'long run',
  }
  let prompt = `Generate a ${input.duration}-minute ${typeLabel[input.run_type]} on ${terrainLabel[input.terrain]}.`
  if (sessionContext) prompt += `\nExtra context from the user: ${sessionContext}`
  return prompt
}

function buildSwimPrompt(input: SwimInput, sessionContext?: string): string {
  const focusLabel: Record<string, string> = {
    fitness: 'general fitness', technique: 'technique and drills', endurance: 'endurance', speed: 'speed and sprints',
  }
  const venueLabel: Record<string, string> = {
    'indoor pool': 'indoor pool', 'outdoor pool': 'outdoor pool', 'open water': 'open water',
  }
  let prompt = `Generate a ${input.duration}-minute swim session focused on ${focusLabel[input.focus]} in a ${venueLabel[input.venue]}.`
  if (sessionContext) prompt += `\nExtra context from the user: ${sessionContext}`
  return prompt
}

export async function generateRunPlan(
  input: RunInput,
  profile: Partial<Profile> | null,
  sessionContext?: string,
): Promise<WorkoutPlan> {
  return generateWithFallback(buildRunSystemPrompt(profile), buildRunPrompt(input, sessionContext))
}

export async function generateSwimPlan(
  input: SwimInput,
  profile: Partial<Profile> | null,
  sessionContext?: string,
): Promise<WorkoutPlan> {
  return generateWithFallback(buildSwimSystemPrompt(profile), buildSwimPrompt(input, sessionContext))
}

export async function generateVariation(
  plan: WorkoutPlan,
  profile: Partial<Profile> | null,
): Promise<WorkoutPlan> {
  return generateWithFallback(buildSystemPrompt(profile), buildVariationPrompt(plan))
}
