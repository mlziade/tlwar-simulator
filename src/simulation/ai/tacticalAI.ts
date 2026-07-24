import { ATTACK_RANGE, STEERING_SEPARATION_RADIUS, STEERING_SEPARATION_WEIGHT } from '../../constants'
import type { Unit } from '../../units/Unit'
import type { World } from '../world'
import type { AIAction, AIAlgorithm } from './interface'

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export class TacticalAI implements AIAlgorithm {
  decide(unit: Unit, world: World): AIAction {
    // Lock on while in melee range — don't interrupt ongoing combat
    if (unit.currentTarget?.isAlive) {
      const d = dist(unit.position, unit.currentTarget.position)
      if (d <= ATTACK_RANGE) {
        if (unit.attackCooldownMs <= 0) return { type: 'attack', target: unit.currentTarget }
        // Cooldown active but engaged — hold position instead of pushing into target
        return { type: 'idle' }
      }
    }

    // Re-pick target only when current one is gone (sticky targeting until death)
    if (!unit.currentTarget?.isAlive) {
      unit.currentTarget = this.selectTarget(unit, world)
    }

    const target = unit.currentTarget
    if (!target) return { type: 'idle' }

    const d = dist(unit.position, target.position)
    if (d <= ATTACK_RANGE && unit.attackCooldownMs <= 0) return { type: 'attack', target }
    if (d <= ATTACK_RANGE) return { type: 'idle' }

    // Seek direction toward target
    const seekDx = target.position.x - unit.position.x
    const seekDy = target.position.y - unit.position.y
    const seekLen = Math.hypot(seekDx, seekDy)
    if (seekLen === 0) return { type: 'idle' }

    // Blend seek with lateral repulsion from nearby allies.
    // This fans units out as they approach instead of stacking them into a blob.
    const sep = this.separationForce(unit, world)
    const dx = seekDx / seekLen + sep.x * STEERING_SEPARATION_WEIGHT
    const dy = seekDy / seekLen + sep.y * STEERING_SEPARATION_WEIGHT
    const len = Math.hypot(dx, dy)
    if (len === 0) return { type: 'idle' }
    return { type: 'move', direction: { x: dx / len, y: dy / len } }
  }

  // Repulsive force from nearby allies — normalized so magnitude doesn't grow with crowd size
  private separationForce(unit: Unit, world: World): { x: number; y: number } {
    let fx = 0, fy = 0
    for (const ally of world.getNearbyAllies(unit)) {
      const dx = unit.position.x - ally.position.x
      const dy = unit.position.y - ally.position.y
      const d = Math.hypot(dx, dy)
      if (d > 0 && d < STEERING_SEPARATION_RADIUS) {
        // Linear falloff: full strength at d=0, zero at d=SEPARATION_RADIUS
        const strength = (STEERING_SEPARATION_RADIUS - d) / STEERING_SEPARATION_RADIUS
        fx += (dx / d) * strength
        fy += (dy / d) * strength
      }
    }
    const len = Math.hypot(fx, fy)
    return len > 0 ? { x: fx / len, y: fy / len } : { x: 0, y: 0 }
  }

  private selectTarget(unit: Unit, world: World): Unit | null {
    switch (unit.unitType) {
      case 'assassin': return world.getLowestHpEnemy(unit)
      case 'tank':     return world.getMostDangerousEnemy(unit)
      default:         return this.getSpreadTarget(unit, world)
    }
  }

  // Warriors pick targets using a spread-score: prefer enemies that fewer allies are already
  // targeting. Units in world.units are processed sequentially, so each warrior that picks
  // a target this tick immediately makes that enemy "congested" for the next warrior.
  // Result: warriors spread across the enemy front in a single tick at battle start.
  private getSpreadTarget(unit: Unit, world: World): Unit | null {
    const myTeam = world.teamMap.get(unit.id)

    const attackerCount = new Map<string, number>()
    for (const ally of world.units) {
      if (!ally.isAlive || ally === unit || world.teamMap.get(ally.id) !== myTeam) continue
      if (ally.currentTarget?.isAlive) {
        const id = ally.currentTarget.id
        attackerCount.set(id, (attackerCount.get(id) ?? 0) + 1)
      }
    }

    let best: Unit | null = null
    let bestScore = -Infinity
    for (const enemy of world.units) {
      if (!enemy.isAlive || world.teamMap.get(enemy.id) === myTeam) continue
      const d = dist(unit.position, enemy.position)
      const count = attackerCount.get(enemy.id) ?? 0
      // +50 base avoids singularity at d=0; penalty of 0.5 per attacker means
      // ~5 attackers on a nearby enemy tips a warrior to seek a more distant target
      const score = 1000 / (d + 50) - count * 0.5
      if (score > bestScore) { bestScore = score; best = enemy }
    }
    return best
  }
}
