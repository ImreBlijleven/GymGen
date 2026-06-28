export function DumbbellLogo({ size = 28 }: { size?: number }) {
  const w = Math.round((size * 80) / 34)
  return (
    <svg width={w} height={size} viewBox="0 0 80 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="17" y="12" width="46" height="10" rx="2" fill="#f59e0b"/>
      <circle cx="17" cy="17" r="14" fill="#f59e0b"/>
      <circle cx="17" cy="17" r="10" fill="#1a1208"/>
      <circle cx="17" cy="17" r="7" fill="#f59e0b" fillOpacity="0.15"/>
      <circle cx="17" cy="17" r="3" fill="#0e0b08"/>
      <circle cx="63" cy="17" r="14" fill="#f59e0b"/>
      <circle cx="63" cy="17" r="10" fill="#1a1208"/>
      <circle cx="63" cy="17" r="7" fill="#f59e0b" fillOpacity="0.15"/>
      <circle cx="63" cy="17" r="3" fill="#0e0b08"/>
    </svg>
  )
}
