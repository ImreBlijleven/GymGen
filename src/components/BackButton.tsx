'use client'
import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  return (
    <button onClick={() => router.back()} className="text-[var(--muted)] hover:text-white mb-4 text-sm transition-colors">
      ← Back
    </button>
  )
}
