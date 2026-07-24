import { Unit } from './Unit'

export class Warrior extends Unit {
  constructor(team: string, position: { x: number; y: number }) {
    super(team, position, 'warrior', 100, 15, 15, 60, 1.0)
  }
}
