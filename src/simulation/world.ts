import type { Editor } from 'tldraw'
import { SPATIAL_GRID_CELL_SIZE } from '../constants'
import type { Unit } from '../units/Unit'
import { createUnit, type UnitType } from '../units/registry'
import type { ZoneManager } from '../zones/ZoneManager'

class SpatialGrid {
  private cells = new Map<string, Set<Unit>>()

  constructor(private cellSize: number) {}

  private key(pos: { x: number; y: number }): string {
    const col = Math.floor(pos.x / this.cellSize)
    const row = Math.floor(pos.y / this.cellSize)
    return `${col},${row}`
  }

  insert(unit: Unit): void {
    const k = this.key(unit.position)
    let cell = this.cells.get(k)
    if (!cell) { cell = new Set(); this.cells.set(k, cell) }
    cell.add(unit)
  }

  remove(unit: Unit): void {
    const k = this.key(unit.position)
    this.cells.get(k)?.delete(unit)
  }

  move(unit: Unit, oldPos: { x: number; y: number }): void {
    const oldKey = `${Math.floor(oldPos.x / this.cellSize)},${Math.floor(oldPos.y / this.cellSize)}`
    const newKey = this.key(unit.position)
    if (oldKey !== newKey) {
      this.cells.get(oldKey)?.delete(unit)
      let cell = this.cells.get(newKey)
      if (!cell) { cell = new Set(); this.cells.set(newKey, cell) }
      cell.add(unit)
    }
  }

  getNearbyUnits(pos: { x: number; y: number }): Unit[] {
    const col = Math.floor(pos.x / this.cellSize)
    const row = Math.floor(pos.y / this.cellSize)
    const result: Unit[] = []
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const cell = this.cells.get(`${col + dc},${row + dr}`)
        if (cell) result.push(...cell)
      }
    }
    return result
  }

  clear(): void {
    this.cells.clear()
  }

  rebuild(units: Unit[]): void {
    this.cells.clear()
    for (const unit of units) {
      if (unit.isAlive) this.insert(unit)
    }
  }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export class World {
  units: Unit[] = []
  spatialGrid: SpatialGrid
  teamMap = new Map<string, string>()

  constructor(editor: Editor, zoneManager: ZoneManager) {
    this.spatialGrid = new SpatialGrid(SPATIAL_GRID_CELL_SIZE)

    const shapes = editor.getCurrentPageShapes().filter(s => s.type === 'unit')

    const teamUpdates: any[] = []
    for (const shape of shapes) {
      const pos = { x: shape.x, y: shape.y }
      const props = shape.props as { unitType: UnitType; hp: number; maxHp: number; team: string }
      const team = zoneManager.getTeam(pos)
      const unit = createUnit(props.unitType, team, pos)
      unit.shapeId = shape.id
      unit.hp = props.hp
      this.units.push(unit)
      this.teamMap.set(unit.id, team)
      this.spatialGrid.insert(unit)
      teamUpdates.push({ id: shape.id, type: 'unit', props: { team } })
    }
    editor.run(() => { editor.updateShapes(teamUpdates) }, { history: 'ignore' })
  }

  removeUnit(unit: Unit): void {
    unit.isAlive = false
    this.units = this.units.filter(u => u !== unit)
    this.spatialGrid.remove(unit)
  }

  getNearestEnemy(unit: Unit): Unit | null {
    const myTeam = this.teamMap.get(unit.id)
    let nearest: Unit | null = null
    let minDist = Infinity

    // Spatial grid for nearby candidates first
    for (const other of this.spatialGrid.getNearbyUnits(unit.position)) {
      if (!other.isAlive) continue
      if (this.teamMap.get(other.id) === myTeam) continue
      const d = dist(unit.position, other.position)
      if (d < minDist) { minDist = d; nearest = other }
    }

    // Global fallback when no enemy in neighborhood (units starting far apart)
    if (!nearest) {
      for (const other of this.units) {
        if (!other.isAlive || other === unit) continue
        if (this.teamMap.get(other.id) === myTeam) continue
        const d = dist(unit.position, other.position)
        if (d < minDist) { minDist = d; nearest = other }
      }
    }

    return nearest
  }

  checkVictory(): string | null {
    const livingTeams = new Set(
      this.units.filter(u => u.isAlive).map(u => this.teamMap.get(u.id)!)
    )
    if (livingTeams.size === 1) return [...livingTeams][0]
    if (livingTeams.size === 0) return 'nobody'
    return null
  }
}
