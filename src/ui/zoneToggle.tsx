import React from 'react'
import { useValue } from 'tldraw'
import { zoneCount, simState } from './state'
import { getZoneManager } from '../runtime'

export function ZoneToggle() {
  const count = useValue(zoneCount)
  const state = useValue(simState)
  const disabled = state !== 'idle'

  function toggle() {
    const zm = getZoneManager()
    if (!zm) return
    const next: 2 | 4 = count === 2 ? 4 : 2
    zoneCount.set(next)
    zm.setZoneCount(next)
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      title="Toggle between 2-team and 4-team mode"
      style={{
        padding: '3px 9px',
        borderRadius: 5,
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.38 : 1,
        fontSize: 11,
        background: 'rgba(255,255,255,0.05)',
        color: 'rgba(255,255,255,0.7)',
        whiteSpace: 'nowrap',
      }}
    >
      {count === 2 ? '2 Teams' : '4 Teams'}
    </button>
  )
}
