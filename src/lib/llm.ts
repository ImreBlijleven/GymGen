import { WorkoutPlan, ChoicesInput, Profile, Location, MuscleGroup } from './types'

const WORKOUT_SCHEMA = `{
  "title": "string",
  "duration_minutes": number,
  "location": "gym|home|hotel|outdoors",
  "muscle_groups": ["string"],
  "exercises": [
    {
      "name": "string",
      "sets": number (optional),
      "reps": number (optional),
      "duration_seconds": number (optional),
      "rest_seconds": number,
      "notes": "string (optional)"
    }
  ]
}`

function buildSystemPrompt(profile: Partial<Profile> | null): string {
  const profileBlock = profile
    ? `User profile: fitness level = ${profile.fitness_level ?? 'intermediate'}, available equipment = ${(profile.default_equipment ?? []).join(', ') || 'none specified'}.`
    : 'User profile: fitness level = intermediate, no specific equipment preferences.'

  return `You are an expert personal trainer with deep knowledge of exercise science.
${profileBlock}
Today's date: ${new Date().toISOString().split('T')[0]}.

IMPORTANT: You must respond with ONLY valid JSON matching this exact schema — no prose, no markdown fences, no extra text:
${WORKOUT_SCHEMA}

Rules:
- Respect the user's equipment, time limit, and fitness level
- Beginners: avoid complex lifts, prioritise form, lighter intensity
- Always include rest_seconds for every exercise
- Add notes when exercise form matters
- Total exercise time should fit within duration_minutes`
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
    model: 'gemini-1.5-flash',
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
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  })
  if (!response.ok) throw new Error(`Groq error: ${response.status}`)
  const data = await response.json()
  const text = data.choices[0].message.content.trim()
  const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  try {
    return JSON.parse(json) as WorkoutPlan
  } catch {
    throw new Error('Groq returned invalid JSON')
  }
}

const FALLBACK_PLAN: WorkoutPlan = {
  title: 'Quick Bodyweight Session',
  duration_minutes: 30,
  location: 'home',
  muscle_groups: ['full body'],
  exercises: [
    { name: 'Jumping Jacks', sets: 3, reps: 30, rest_seconds: 30, notes: 'Warm up, keep a steady pace' },
    { name: 'Push Up', sets: 3, reps: 10, rest_seconds: 60, notes: 'Keep core tight, elbows at 45°' },
    { name: 'Bodyweight Squat', sets: 3, reps: 15, rest_seconds: 60, notes: 'Knees track over toes' },
    { name: 'Plank', duration_seconds: 30, sets: 3, rest_seconds: 45, notes: 'Neutral spine, breathe steadily' },
    { name: 'Mountain Climbers', sets: 3, reps: 20, rest_seconds: 45 },
  ],
}

async function generateWithFallback(systemPrompt: string, userPrompt: string): Promise<WorkoutPlan> {
  try {
    return await callGemini(systemPrompt, userPrompt)
  } catch (e) {
    console.warn('Gemini failed, trying Groq:', e)
    try {
      return await callGroq(systemPrompt, userPrompt)
    } catch (e2) {
      console.warn('Groq failed, using fallback plan:', e2)
      return FALLBACK_PLAN
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

export async function generateVariation(
  plan: WorkoutPlan,
  profile: Partial<Profile> | null,
): Promise<WorkoutPlan> {
  return generateWithFallback(buildSystemPrompt(profile), buildVariationPrompt(plan))
}
