import type { Editor, TLShapeId } from 'tldraw'
import { TICK_RATE } from '../constants'
import type { Unit } from '../units/Unit'
import { unitSize } from '../shapes/UnitShape'
import type { World } from './world'
import type { AIAlgorithm } from './ai/interface'

const DEATH_FADE_MS = 600

export class SimulationLoop {
  private accumulated = 0
  private _running = false
  private dyingUnits = new Map<TLShapeId, number>() // shapeId → death start timestamp

  constructor(
    private editor: Editor,
    private world: World,
    private ai: AIAlgorithm,
    private onVictory: (team: string) => void,
    private onDamage?: (x: number, y: number, amount: number) => void,
  ) {}

  start(): void {
    this._running = true
    this.editor.on('tick', this.onTick)
  }

  stop(): void {
    this._running = false
    this.editor.off('tick', this.onTick)
  }

  get running(): boolean {
    return this._running
  }

  private onTick = (elapsed: number): void => {
    this.accumulated += elapsed
    if (this.accumulated < TICK_RATE) return
    const dt = this.accumulated
    this.accumulated = 0

    const { world, ai, editor } = this
    const movedUnits = new Set<Unit>()
    const hpUpdates: any[] = []

    // 1. Cooldowns
    for (const unit of [...world.units]) {
      unit.onTick(dt)
    }

    // 2. AI decisions
    for (const unit of [...world.units]) {
      if (!unit.isAlive) continue
      const action = ai.decide(unit, world)

      if (action.type === 'move') {
        const oldPos = { ...unit.position }
        unit.position.x += action.direction.x * unit.moveSpeed * (dt / 1000)
        unit.position.y += action.direction.y * unit.moveSpeed * (dt / 1000)
        world.spatialGrid.move(unit, oldPos)
        movedUnits.add(unit)
      } else if (action.type === 'attack') {
        const effective = action.target.takeDamage(unit.damage)
        unit.attackCooldownMs = 1000 / unit.attackSpeed
        this.onDamage?.(action.target.position.x, action.target.position.y, effective)
        if (!action.target.isAlive) {
          this.dyingUnits.set(action.target.shapeId as TLShapeId, Date.now())
          world.removeUnit(action.target)
        } else {
          hpUpdates.push({
            id: action.target.shapeId as TLShapeId,
            type: 'unit',
            props: { hp: action.target.hp },
          })
        }
      }
    }

    // 3. Separation pass — nudge overlapping units apart using the spatial grid
    for (const unit of world.units) {
      if (!unit.isAlive) continue
      for (const other of world.spatialGrid.getNearbyUnits(unit.position)) {
        if (other === unit || !other.isAlive) continue
        const dx = unit.position.x - other.position.x
        const dy = unit.position.y - other.position.y
        const distSq = dx * dx + dy * dy
        const minDist = unit.radius + other.radius
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const d = Math.sqrt(distSq)
          const push = (minDist - d) * 0.5
          unit.position.x += (dx / d) * push
          unit.position.y += (dy / d) * push
          movedUnits.add(unit)
        }
      }
    }

    // 4. Rebuild grid to reflect post-separation positions
    world.spatialGrid.rebuild(world.units)

    // 5. Process death fade animations
    const now = Date.now()
    const finishedDying: TLShapeId[] = []
    const opacityUpdates: any[] = []
    for (const [shapeId, startMs] of this.dyingUnits) {
      const age = (now - startMs) / DEATH_FADE_MS
      if (age >= 1) {
        finishedDying.push(shapeId)
      } else {
        opacityUpdates.push({ id: shapeId, type: 'unit', opacity: 1 - age })
      }
    }
    for (const id of finishedDying) this.dyingUnits.delete(id)

    // 6. Batch all canvas writes — convert center position back to tldraw top-left
    const posUpdates: any[] = []
    for (const unit of movedUnits) {
      if (unit.isAlive) {
        const sz = unitSize(unit.unitType)
        posUpdates.push({
          id: unit.shapeId as TLShapeId,
          type: 'unit',
          x: unit.position.x - sz.w / 2,
          y: unit.position.y - sz.h / 2,
        })
      }
    }

    editor.run(() => {
      if (posUpdates.length > 0 || hpUpdates.length > 0 || opacityUpdates.length > 0) {
        editor.updateShapes([...posUpdates, ...hpUpdates, ...opacityUpdates])
      }
      if (finishedDying.length > 0) editor.deleteShapes(finishedDying)
    }, { history: 'ignore' })

    const winner = world.checkVictory()
    if (winner) {
      this.stop()
      this.onVictory(winner)
    }
  }
}
