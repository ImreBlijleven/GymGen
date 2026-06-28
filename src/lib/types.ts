export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
export type Location = 'gym' | 'home' | 'hotel' | 'outdoors' | 'pool' | 'open water'
export type Intensity = 'light' | 'moderate' | 'hard'
export type GenerationMode = 'chat' | 'choices' | 'saved' | 'run' | 'swim'
export type RunType = 'easy' | 'tempo' | 'interval' | 'long run'
export type RunTerrain = 'road' | 'trail' | 'track' | 'treadmill'
export type SwimFocus = 'fitness' | 'technique' | 'endurance' | 'speed'
export type SwimVenue = 'indoor pool' | 'outdoor pool' | 'open water'
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'full body'
  | 'cardio'

export type Equipment =
  // Bodyweight
  | 'bodyweight'
  // Free weights
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'e-z curl bar' | 'resistance bands'
  // Cardio machines
  | 'treadmill' | 'elliptical' | 'stationary bike' | 'rowing machine' | 'stair climber' | 'air bike'
  // Strength machines
  | 'squat rack' | 'smith machine' | 'leg press' | 'lat pulldown' | 'chest press machine' | 'cable machine'
  // Other
  | 'exercise ball' | 'medicine ball' | 'foam roller'

export interface Exercise {
  name: string
  sets?: number
  reps?: number
  duration_seconds?: number
  rest_seconds: number
  equipment?: string
  instructions?: string[]
  tips?: string
  notes?: string
  gif_url?: string
  description?: string
  muscle_groups?: string[]
  wger_id?: number
}

export interface WorkoutPlan {
  title: string
  duration_minutes: number
  location: Location
  muscle_groups: MuscleGroup[]
  exercises: Exercise[]
}

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export interface Profile {
  id: string
  name: string | null
  age: number | null
  fitness_level: FitnessLevel
  default_equipment: string[]
  gender: Gender | null
  preferences: string | null
  run_preferences: string | null
  swim_preferences: string | null
}

export interface Workout {
  id: string
  user_id: string
  created_at: string
  title: string
  source: GenerationMode
  plan: WorkoutPlan
  muscle_groups: string[]
  duration_minutes: number
  location: string
}

export interface SavedWorkout {
  id: string
  user_id: string
  workout_id: string
  name: string
  pinned: boolean
  workout?: Workout
}

export interface WgerExercise {
  wger_id: number
  name: string
  muscle_groups: string[]
  equipment: string[]
  gif_url: string
  description: string
}

export interface ChoicesInput {
  duration: 15 | 30 | 45 | 60 | 90
  location: Location
  muscle_groups: MuscleGroup[]
  intensity: Intensity
}

export interface RunInput {
  duration: 20 | 30 | 45 | 60 | 90
  run_type: RunType
  terrain: RunTerrain
}

export interface SwimInput {
  duration: 20 | 30 | 45 | 60
  focus: SwimFocus
  venue: SwimVenue
}
