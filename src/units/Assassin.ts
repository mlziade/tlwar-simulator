import { Unit } from './Unit'

export class Assassin extends Unit {
  constructor(team: string, position: { x: number; y: number }) {
    super(team, position, 'assassin', 50, 40, 2, 120, 2.0)
  }
}
