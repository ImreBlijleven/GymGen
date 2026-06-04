export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
export type Location = 'gym' | 'home' | 'hotel' | 'outdoors'
export type Intensity = 'light' | 'moderate' | 'hard'
export type GenerationMode = 'chat' | 'choices' | 'saved'
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
  | 'squat rack' | 'smith machine' | 'leg press' | 'lat pulldown' | 'chest press machine' | 'cable machine' | 'machine'
  // Other
  | 'exercise ball' | 'medicine ball' | 'foam roller'

export interface Exercise {
  name: string
  sets?: number
  reps?: number
  duration_seconds?: number
  rest_seconds: number
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

export interface Profile {
  id: string
  name: string | null
  age: number | null
  fitness_level: FitnessLevel
  default_equipment: string[]
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
  duration: 15 | 30 | 45 | 60
  location: Location
  muscle_groups: MuscleGroup[]
  intensity: Intensity
}
