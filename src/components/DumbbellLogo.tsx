// Barbell logomark — horizontal bar with two symmetrical plate pairs
export function DumbbellLogo({ size = 28 }: { size?: number }) {
  const w = Math.round((size * 96) / 34)
  return (
    <svg width={w} height={size} viewBox="0 0 96 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* bar */}
      <rect x="11" y="14" width="74" height="6" rx="3" fill="#f59e0b"/>
      {/* left outer plate */}
      <rect x="11" y="5" width="9" height="24" rx="3" fill="#f59e0b"/>
      {/* left inner plate */}
      <rect x="22" y="9" width="6" height="16" rx="2.5" fill="#f59e0b"/>
      {/* right inner plate */}
      <rect x="68" y="9" width="6" height="16" rx="2.5" fill="#f59e0b"/>
      {/* right outer plate */}
      <rect x="76" y="5" width="9" height="24" rx="3" fill="#f59e0b"/>
    </svg>
  )
}
