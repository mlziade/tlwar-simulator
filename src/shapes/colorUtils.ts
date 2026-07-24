function toHex(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
}

export function interpolateHealthColor(ratio: number): string {
  const r = Math.max(0, Math.min(1, ratio))
  if (r === 0) return '#9E9E9E'
  const r1 = 0xf4, g1 = 0x43, b1 = 0x36 // red #F44336
  const r2 = 0x4c, g2 = 0xaf, b2 = 0x50 // green #4CAF50
  return `#${toHex(r1 + (r2 - r1) * r)}${toHex(g1 + (g2 - g1) * r)}${toHex(b1 + (b2 - b1) * r)}`
}

export function teamColor(team: string): string {
  switch (team) {
    case 'A': return '#1565C0'
    case 'B': return '#E65100'
    case 'C': return '#6A1B9A'
    case 'D': return '#00838F'
    default:  return '#888888'
  }
}
