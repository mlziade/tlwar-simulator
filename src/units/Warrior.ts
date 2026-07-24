import { Unit } from './Unit'

export class Warrior extends Unit {
  constructor(team: string, position: { x: number; y: number }) {
    super(team, position, 'warrior', 100, 15, 15, 72, 1.2)
    this.radius = 16
  }
}
