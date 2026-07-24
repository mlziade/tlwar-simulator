import { ATTACK_RANGE } from '../../constants'
import type { Unit } from '../../units/Unit'
import type { World } from '../world'
import type { AIAction, AIAlgorithm } from './interface'

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export class TacticalAI implements AIAlgorithm {
  decide(unit: Unit, world: World): AIAction {
    // While in melee range, finish the current kill before re-evaluating.
    // Returning idle (not moving) prevents units from pushing into each other
    // while cooldown ticks down, which would fight the separation pass.
    if (unit.currentTarget?.isAlive) {
      const d = dist(unit.position, unit.currentTarget.position)
      if (d <= ATTACK_RANGE) {
        if (unit.attackCooldownMs <= 0) return { type: 'attack', target: unit.currentTarget }
        return { type: 'idle' }
      }
    }

    // Re-evaluate target every tick based on unit role
    let target: Unit | null
    switch (unit.unitType) {
      case 'assassin':
        // Pick off the most wounded enemy — maximise kill pressure
        target = world.getLowestHpEnemy(unit)
        break
      case 'tank':
        // Rush toward the enemy deepest inside allied lines — protective frontliner
        target = world.getMostDangerousEnemy(unit)
        break
      default:
        // Warriors pick the nearest enemy
        target = world.getNearestEnemy(unit)
    }

    unit.currentTarget = target
    if (!target) return { type: 'idle' }

    const d = dist(unit.position, target.position)
    if (d <= ATTACK_RANGE && unit.attackCooldownMs <= 0) return { type: 'attack', target }

    const dx = target.position.x - unit.position.x
    const dy = target.position.y - unit.position.y
    const len = Math.hypot(dx, dy)
    if (len === 0) return { type: 'idle' }
    return { type: 'move', direction: { x: dx / len, y: dy / len } }
  }
}
