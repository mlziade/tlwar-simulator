import { ATTACK_RANGE, RETARGET_RADIUS } from '../../constants'
import type { Unit } from '../../units/Unit'
import type { World } from '../world'
import type { AIAction, AIAlgorithm } from './interface'

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export class NearestEnemyAI implements AIAlgorithm {
  decide(unit: Unit, world: World): AIAction {
    if (
      unit.currentTarget &&
      (!unit.currentTarget.isAlive || dist(unit.position, unit.currentTarget.position) > RETARGET_RADIUS)
    ) {
      unit.currentTarget = null
    }

    if (!unit.currentTarget) {
      unit.currentTarget = world.getNearestEnemy(unit)
    }

    if (!unit.currentTarget) return { type: 'idle' }

    const target = unit.currentTarget
    const d = dist(unit.position, target.position)

    if (d <= ATTACK_RANGE && unit.attackCooldownMs <= 0) {
      return { type: 'attack', target }
    }

    const dx = target.position.x - unit.position.x
    const dy = target.position.y - unit.position.y
    const len = Math.hypot(dx, dy)
    if (len === 0) return { type: 'idle' }
    return { type: 'move', direction: { x: dx / len, y: dy / len } }
  }
}
