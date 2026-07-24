import React, { useRef, useState, useEffect } from 'react'
import { useValue, useEditor, type TLShapeId } from 'tldraw'
import { simState, borderWarning, victoryTeam } from './state'
import { World } from '../simulation/world'
import { SimulationLoop } from '../simulation/loop'
import { TacticalAI } from '../simulation/ai/tacticalAI'
import { getZoneManager } from '../runtime'
import { teamColor } from '../shapes/colorUtils'
import { emitDamage } from './DamageNumbers'
import { Toolbar } from './toolbar'
import { ZoneToggle } from './zoneToggle'

const panel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  background: 'rgba(255,255,255,0.95)',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  flexWrap: 'wrap',
  maxWidth: '100%',
  pointerEvents: 'all',
}

const divider: React.CSSProperties = {
  width: 1, height: 22, background: '#e8e8e8', flexShrink: 0,
}

const actionBtn = (color: string, disabled = false): React.CSSProperties => ({
  padding: '5px 14px',
  borderRadius: 6,
  border: 'none',
  background: disabled ? '#e0e0e0' : color,
  color: disabled ? '#aaa' : '#fff',
  fontWeight: 600,
  fontSize: 12,
  cursor: disabled ? 'not-allowed' : 'pointer',
})

export function Controls() {
  const editor = useEditor()
  const state = useValue(simState)
  const warning = useValue(borderWarning)
  const winner = useValue(victoryTeam)
  const loopRef = useRef<SimulationLoop | null>(null)
  const worldRef = useRef<World | null>(null)
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const timer = setInterval(() => {
      const w = worldRef.current
      if (!w) return
      const counts: Record<string, number> = {}
      for (const unit of w.units) {
        if (!unit.isAlive) continue
        const team = w.teamMap.get(unit.id)
        if (team) counts[team] = (counts[team] ?? 0) + 1
      }
      setTeamCounts(counts)
    }, 250)
    return () => clearInterval(timer)
  }, [])

  function validateBorders(): boolean {
    const zm = getZoneManager()
    if (!zm) return false
    const shapes = editor.getCurrentPageShapes().filter(s => s.type === 'unit')
    for (const s of shapes) {
      const props = s.props as { w: number; h: number }
      const cx = s.x + (props.w ?? 0) / 2
      const cy = s.y + (props.h ?? 0) / 2
      if (zm.isOnBorder({ x: cx, y: cy })) { borderWarning.set(true); return false }
    }
    borderWarning.set(false)
    return true
  }

  function handlePlay() {
    if (!validateBorders()) return
    const zm = getZoneManager()
    if (!zm) return
    const world = new World(editor, zm)
    worldRef.current = world
    const loop = new SimulationLoop(
      editor, world, new TacticalAI(),
      (team) => { victoryTeam.set(team); simState.set('idle') },
      (x, y, amt) => emitDamage(x, y, amt),
    )
    loopRef.current = loop
    loop.start()
    simState.set('running')
  }

  function handlePause() {
    loopRef.current?.stop()
    simState.set('paused')
  }

  function handleClearAll() {
    loopRef.current?.stop()
    loopRef.current = null
    worldRef.current = null
    setTeamCounts({})
    const unitIds = editor.getCurrentPageShapes()
      .filter(s => s.type === 'unit').map(s => s.id as TLShapeId)
    if (unitIds.length > 0) editor.deleteShapes(unitIds)
    const zm = getZoneManager()
    if (zm) { zm.cleanup(); zm.renderBorders() }
    simState.set('idle')
    borderWarning.set(false)
    victoryTeam.set(null)
  }

  const teams = Object.keys(teamCounts).sort()

  return (
    <>
      {/* ── Controls bar ───────────────────────────────────────────────────── */}
      <div style={panel}>
        <Toolbar />
        <span style={divider} />
        <ZoneToggle />

        {teams.length > 0 && (
          <>
            <span style={divider} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {teams.map(team => (
                <div key={team} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: teamColor(team), flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: '#555', fontVariantNumeric: 'tabular-nums' }}>
                    {teamCounts[team]}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <span style={divider} />

        {(state === 'idle' || state === 'paused') && (
          <button style={actionBtn('#2e7d32', warning)} onClick={handlePlay} disabled={warning}>
            {state === 'paused' ? 'Resume' : 'Play'}
          </button>
        )}
        {state === 'running' && (
          <button style={actionBtn('#e65100')} onClick={handlePause}>Pause</button>
        )}
        <button style={actionBtn('#555')} onClick={handleClearAll}>Clear</button>

        {warning && (
          <span style={{ fontSize: 11, color: '#c62828', maxWidth: 180 }}>
            Units on border — move them first.
          </span>
        )}
      </div>

      {/* ── Victory card ────────────────────────────────────────────────────── */}
      {winner && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'all',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: '28px 36px',
            textAlign: 'center',
            boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
            border: '1px solid #e8e8e8',
            minWidth: 220,
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: winner === 'nobody' ? '#555' : teamColor(winner),
              marginBottom: 4,
              letterSpacing: '0.01em',
            }}>
              {winner === 'nobody' ? 'Draw' : `Team ${winner} wins`}
            </div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 20 }}>
              {winner === 'nobody' ? 'Both sides were eliminated.' : 'All enemies defeated.'}
            </div>
            <button
              onClick={handleClearAll}
              style={{
                padding: '6px 20px',
                borderRadius: 6,
                border: '1px solid #e8e8e8',
                background: '#fff',
                color: '#333',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </>
  )
}
