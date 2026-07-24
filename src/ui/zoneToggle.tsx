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
      style={{
        padding: '4px 10px',
        borderRadius: 6,
        border: '1px solid #ccc',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: 12,
        background: '#fff',
      }}
    >
      {count === 2 ? '2 Teams' : '4 Teams'}
    </button>
  )
}
