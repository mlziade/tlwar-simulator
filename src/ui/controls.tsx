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

// ── Styles ────────────────────────────────────────────────────────────────────

const panel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '7px 14px',
  background: 'rgba(14, 16, 22, 0.93)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 11,
  boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
  flexWrap: 'wrap',
  maxWidth: '100%',
  pointerEvents: 'all',
  backdropFilter: 'blur(8px)',
}

const divider: React.CSSProperties = {
  width: 1, height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0,
}

function ActionBtn({ color, disabled = false, onClick, children }: {
  color: string; disabled?: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 14px',
        borderRadius: 7,
        border: 'none',
        background: disabled ? 'rgba(255,255,255,0.06)' : color,
        color: disabled ? 'rgba(255,255,255,0.3)' : '#fff',
        fontWeight: 700,
        fontSize: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '0.02em',
        boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function Controls() {
  const editor = useEditor()
  const state = useValue(simState)
  const warning = useValue(borderWarning)
  const winner = useValue(victoryTeam)
  const loopRef = useRef<SimulationLoop | null>(null)
  const worldRef = useRef<World | null>(null)
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({})

  // Poll living unit counts from the world while simulation runs
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
      if (zm.isOnBorder({ x: cx, y: cy })) {
        borderWarning.set(true)
        return false
      }
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
      .filter(s => s.type === 'unit')
      .map(s => s.id as TLShapeId)
    if (unitIds.length > 0) editor.deleteShapes(unitIds)

    const zm = getZoneManager()
    if (zm) { zm.cleanup(); zm.renderBorders() }

    simState.set('idle')
    borderWarning.set(false)
    victoryTeam.set(null)
  }

  // ── Team legend (shown while running or paused) ───────────────────────────
  const teams = Object.keys(teamCounts).sort()
  const showLegend = teams.length > 0

  return (
    <>
      {/* ── Controls bar ───────────────────────────────────────────────────── */}
      <div style={panel}>
        <Toolbar />
        <span style={divider} />
        <ZoneToggle />

        {showLegend && (
          <>
            <span style={divider} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {teams.map(team => (
                <div key={team} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: teamColor(team), flexShrink: 0,
                    boxShadow: `0 0 5px ${teamColor(team)}88`,
                  }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums' }}>
                    {teamCounts[team]}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <span style={divider} />

        {(state === 'idle' || state === 'paused') && (
          <ActionBtn color="#22c55e" disabled={warning} onClick={handlePlay}>
            {state === 'paused' ? 'Resume' : 'Play'}
          </ActionBtn>
        )}
        {state === 'running' && (
          <ActionBtn color="#f97316" onClick={handlePause}>Pause</ActionBtn>
        )}
        <ActionBtn color="rgba(255,255,255,0.1)" onClick={handleClearAll}>Clear</ActionBtn>

        {warning && (
          <span style={{ fontSize: 10, color: '#ff5252', maxWidth: 160, lineHeight: 1.3 }}>
            Units on border — move them first.
          </span>
        )}
      </div>

      {/* ── Victory overlay ─────────────────────────────────────────────────── */}
      {winner && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.72)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'all',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 18,
            padding: '48px 64px',
            textAlign: 'center',
            boxShadow: '0 24px 72px rgba(0,0,0,0.5)',
            borderTop: winner === 'nobody' ? '6px solid #9e9e9e' : `6px solid ${teamColor(winner)}`,
            maxWidth: 340,
            width: '90vw',
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>
              {winner === 'nobody' ? '🤝' : '⚔️'}
            </div>
            <div style={{
              fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em',
              color: winner === 'nobody' ? '#555' : teamColor(winner),
              marginBottom: 6,
            }}>
              {winner === 'nobody' ? 'Draw' : `Team ${winner}`}
            </div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 32, fontWeight: 500 }}>
              {winner === 'nobody' ? 'Both sides annihilated each other.' : 'All enemies defeated.'}
            </div>
            <button
              onClick={handleClearAll}
              style={{
                padding: '10px 28px',
                borderRadius: 9,
                border: 'none',
                background: winner === 'nobody' ? '#757575' : teamColor(winner),
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                letterSpacing: '0.02em',
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
