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
        padding: '4px 10px',
        borderRadius: 6,
        border: '1px solid #e8e8e8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: 12,
        background: '#fff',
        color: '#333',
      }}
    >
      {count === 2 ? '2 Teams' : '4 Teams'}
    </button>
  )
}
