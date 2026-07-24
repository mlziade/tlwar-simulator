import { Unit } from './Unit'
import { Warrior } from './Warrior'
import { Tank } from './Tank'
import { Assassin } from './Assassin'

export type UnitType = 'warrior' | 'tank' | 'assassin'

const registry = {
  warrior: Warrior,
  tank: Tank,
  assassin: Assassin,
} satisfies Record<UnitType, new (team: string, pos: { x: number; y: number }) => Unit>

export function createUnit(type: UnitType, team: string, pos: { x: number; y: number }): Unit {
  return new registry[type](team, pos)
}

export function unitMaxHp(type: UnitType): number {
  const unit = new registry[type]('', { x: 0, y: 0 })
  return unit.maxHp
}
